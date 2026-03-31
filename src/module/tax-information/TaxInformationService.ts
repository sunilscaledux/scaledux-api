import { prisma } from "@services/prismaService";
import { Prisma } from "@prisma/client";
import { Log } from "@services/loggerService";
import { TaxInformationInput } from "./TaxInformationType";
import { verifyPAN, verifyGSTIN, validatePanWithGSTIN, isConfigured as isIdtoaiConfigured } from "@services/idtoaiService";

export class TaxInformationService {

  static async saveTaxInformation(userId: string, data: TaxInformationInput) {
    const userIdNum = parseInt(userId);
    const activeTab = data.activeTab;
    const individualName = data.individualName?.trim() || null;
    const individualPAN = data.individualPAN?.trim().toUpperCase() || null;
    const individualGSTIN = data.individualHasGSTIN ? data.individualGSTIN?.trim().toUpperCase() || null : null;
    const agencyName = data.agencyName?.trim() || null;
    const agencyPAN = data.agencyPAN?.trim().toUpperCase() || null;
    const agencyGSTIN = data.agencyHasGSTIN ? data.agencyGSTIN?.trim().toUpperCase() || null : null;
    const activePanNumber = activeTab === 'AGENCY' ? agencyPAN : individualPAN;
    const activeGSTIN = activeTab === 'AGENCY' ? agencyGSTIN : individualGSTIN;
    const activeHasGSTIN = activeTab === 'AGENCY' ? !!agencyGSTIN : !!individualGSTIN;

    if (activeTab === 'AGENCY') {
      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { agency_verification_status: true }
      });
      if (user?.agency_verification_status !== 'APPROVED') {
        throw new Error("You need to verify your agency before saving agency tax details");
      }
    }

    // ── Real-time verification for active tab ──
    const activeName = activeTab === 'AGENCY' ? agencyName : individualName;
    const activePAN = activeTab === 'AGENCY' ? agencyPAN : individualPAN;
    const activeGSTINValue = activeTab === 'AGENCY' ? agencyGSTIN : individualGSTIN;

    let verificationStatus = 'PENDING';
    let verificationFailureReason: string | null = null;
    let verificationApiResponse: any = Prisma.DbNull;

    if (activePAN && isIdtoaiConfigured()) {
      // Verify PAN
      const panResult = await verifyPAN(activePAN, String(userIdNum));
      if (!panResult.success) {
        return { success: false, message: panResult.error || 'PAN verification failed' };
      }

      // Match name
      if (panResult.full_name && activeName) {
        const panName = panResult.full_name.trim().toLowerCase();
        const userName = activeName.trim().toLowerCase();
        if (panName && userName && !panName.includes(userName) && !userName.includes(panName)) {
          return { success: false, message: `Name mismatch: PAN registered to "${panResult.full_name}", you entered "${activeName}"` };
        }
      }

      verificationStatus = 'VERIFIED';
      verificationApiResponse = panResult.raw || Prisma.DbNull;

      // If GSTIN provided, verify that too
      if (activeGSTINValue) {
        const panGstinCheck = validatePanWithGSTIN(activePAN, activeGSTINValue);
        if (!panGstinCheck.matches) {
          return { success: false, message: panGstinCheck.reason || 'PAN does not match GSTIN' };
        }

        const gstResult = await verifyGSTIN(activeGSTINValue, String(userIdNum));
        if (!gstResult.success) {
          return { success: false, message: gstResult.error || 'GSTIN verification failed' };
        }

        if (gstResult.current_registration_status !== 'Active') {
          return { success: false, message: `GSTIN registration is not active (status: ${gstResult.current_registration_status})` };
        }

        // Match GSTIN legal name
        if (gstResult.legal_name_of_business && activeName) {
          const gstName = gstResult.legal_name_of_business.trim().toLowerCase();
          const userName = activeName.trim().toLowerCase();
          if (gstName && userName && !gstName.includes(userName) && !userName.includes(gstName)) {
            return { success: false, message: `GSTIN name mismatch: registered to "${gstResult.legal_name_of_business}", you entered "${activeName}"` };
          }
        }

        verificationApiResponse = gstResult.raw || panResult.raw || Prisma.DbNull;
      }
    }

    const statusField = activeTab === 'AGENCY' ? 'agency_gstin_status' : 'individual_gstin_status';
    const verifiedAtField = activeTab === 'AGENCY' ? 'agency_gstin_verified_at' : 'individual_gstin_verified_at';
    const failureField = activeTab === 'AGENCY' ? 'agency_gstin_failure_reason' : 'individual_gstin_failure_reason';
    const apiResponseField = activeTab === 'AGENCY' ? 'agency_gstin_api_response' : 'individual_gstin_api_response';

    const verificationData = {
      [statusField]: verificationStatus,
      [verifiedAtField]: verificationStatus === 'VERIFIED' ? new Date() : null,
      [failureField]: verificationFailureReason,
      [apiResponseField]: verificationApiResponse,
    };

    const taxInfo = await prisma.taxInformation.upsert({
      where: { user_id: userIdNum },
      update: {
        tax_residence: data.taxResidence,
        entity_type: activeTab,
        pan_number: activePanNumber,
        individual_name: individualName,
        individual_pan: individualPAN,
        individual_gstin: individualGSTIN,
        agency_name: agencyName,
        agency_pan: agencyPAN,
        agency_gstin: agencyGSTIN,
        has_gstin: activeHasGSTIN,
        gstin: activeGSTIN,
        ...verificationData,
        updated_at: new Date()
      },
      create: {
        user_id: userIdNum,
        tax_residence: data.taxResidence,
        entity_type: activeTab,
        pan_number: activePanNumber,
        individual_name: individualName,
        individual_pan: individualPAN,
        individual_gstin: individualGSTIN,
        agency_name: agencyName,
        agency_pan: agencyPAN,
        agency_gstin: agencyGSTIN,
        has_gstin: activeHasGSTIN,
        gstin: activeGSTIN,
        individual_gstin_status: 'PENDING',
        agency_gstin_status: 'PENDING',
        ...verificationData,
      }
    });

    return {
      success: true,
      message: verificationStatus === 'VERIFIED'
        ? "Tax information verified and saved successfully"
        : "Tax information saved successfully",
      data: TaxInformationService.mapTaxInfo(taxInfo)
    };
  }

  static async getTaxInformation(userId: string) {
    const userIdNum = parseInt(userId);
    const taxInfo = await prisma.taxInformation.findUnique({
      where: { user_id: userIdNum }
    });

    if (!taxInfo) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: TaxInformationService.mapTaxInfo(taxInfo)
    };
  }

  static async verifyPendingGSTINs(): Promise<{ verified: number; failed: number; errors: string[] }> {
    const result = { verified: 0, failed: 0, errors: [] as string[] };
    if (!isIdtoaiConfigured()) return result;

    try {
      const pendingRecords = await prisma.taxInformation.findMany({
        where: {
          OR: [
            { individual_gstin_status: 'IN_REVIEW' },
            { agency_gstin_status: 'IN_REVIEW' },
          ]
        },
        include: { user: { select: { unique_id: true } } },
        take: 100,
      });

      for (const record of pendingRecords) {
        const uid = record.user?.unique_id || `uid:${record.user_id}`;

        // ── Verify individual ──
        if (record.individual_gstin_status === 'IN_REVIEW' && record.individual_pan) {
          try {
            const panResult = await verifyPAN(record.individual_pan, uid);
            if (!panResult.success) {
              await prisma.taxInformation.update({
                where: { id: record.id },
                data: { individual_gstin_status: 'FAILED', individual_gstin_failure_reason: panResult.error || 'PAN verification failed', individual_gstin_api_response: panResult.raw ?? Prisma.DbNull }
              });
              result.failed++;
              continue;
            }

            // Name-only check: compare PAN registered name with user-entered name
            if (panResult.full_name && record.individual_name) {
              const panName = panResult.full_name.trim().toLowerCase();
              const userName = record.individual_name.trim().toLowerCase();
              if (panName && userName && !panName.includes(userName) && !userName.includes(panName)) {
                await prisma.taxInformation.update({
                  where: { id: record.id },
                  data: { individual_gstin_status: 'FAILED', individual_gstin_failure_reason: `Name mismatch: PAN registered to "${panResult.full_name}", you entered "${record.individual_name}"`, individual_gstin_api_response: panResult.raw ?? Prisma.DbNull }
                });
                result.failed++;
                continue;
              }
            }

            if (record.individual_gstin) {
              const panGstinCheck = validatePanWithGSTIN(record.individual_pan, record.individual_gstin);
              if (!panGstinCheck.matches) {
                await prisma.taxInformation.update({
                  where: { id: record.id },
                  data: { individual_gstin_status: 'FAILED', individual_gstin_failure_reason: panGstinCheck.reason || 'PAN does not match GSTIN' }
                });
                result.failed++;
                continue;
              }

              const gstResult = await verifyGSTIN(record.individual_gstin, uid);
              if (!gstResult.success) {
                await prisma.taxInformation.update({
                  where: { id: record.id },
                  data: { individual_gstin_status: 'FAILED', individual_gstin_failure_reason: gstResult.error || 'GSTIN verification failed', individual_gstin_api_response: gstResult.raw ?? Prisma.DbNull }
                });
                result.failed++;
                continue;
              }

              if (gstResult.current_registration_status !== 'Active') {
                await prisma.taxInformation.update({
                  where: { id: record.id },
                  data: { individual_gstin_status: 'FAILED', individual_gstin_failure_reason: `GSTIN registration is not active (status: ${gstResult.current_registration_status})`, individual_gstin_api_response: gstResult.raw ?? Prisma.DbNull }
                });
                result.failed++;
                continue;
              }
            }

            await prisma.taxInformation.update({
              where: { id: record.id },
              data: { individual_gstin_status: 'VERIFIED', individual_gstin_verified_at: new Date(), individual_gstin_failure_reason: null, individual_gstin_api_response: panResult.raw || null }
            });
            result.verified++;
          } catch (err: any) {
            result.errors.push(`Individual PAN/GSTIN (id ${record.id}): ${err.message}`);
            result.failed++;
          }
        }

        // ── Verify agency ──
        if (record.agency_gstin_status === 'IN_REVIEW' && record.agency_pan) {
          try {
            const panResult = await verifyPAN(record.agency_pan, uid);
            if (!panResult.success) {
              await prisma.taxInformation.update({
                where: { id: record.id },
                data: { agency_gstin_status: 'FAILED', agency_gstin_failure_reason: panResult.error || 'PAN verification failed', agency_gstin_api_response: panResult.raw ?? Prisma.DbNull }
              });
              result.failed++;
              continue;
            }

            // Name-only check: compare PAN registered name with agency name
            if (panResult.full_name && record.agency_name) {
              const panName = panResult.full_name.trim().toLowerCase();
              const agencyName = record.agency_name.trim().toLowerCase();
              if (panName && agencyName && !panName.includes(agencyName) && !agencyName.includes(panName)) {
                await prisma.taxInformation.update({
                  where: { id: record.id },
                  data: { agency_gstin_status: 'FAILED', agency_gstin_failure_reason: `Name mismatch: PAN registered to "${panResult.full_name}", you entered "${record.agency_name}"`, agency_gstin_api_response: panResult.raw ?? Prisma.DbNull }
                });
                result.failed++;
                continue;
              }
            }

            if (record.agency_gstin) {
              const panGstinCheck = validatePanWithGSTIN(record.agency_pan, record.agency_gstin);
              if (!panGstinCheck.matches) {
                await prisma.taxInformation.update({
                  where: { id: record.id },
                  data: { agency_gstin_status: 'FAILED', agency_gstin_failure_reason: panGstinCheck.reason || 'PAN does not match GSTIN' }
                });
                result.failed++;
                continue;
              }

              const gstResult = await verifyGSTIN(record.agency_gstin, uid);
              if (!gstResult.success) {
                await prisma.taxInformation.update({
                  where: { id: record.id },
                  data: { agency_gstin_status: 'FAILED', agency_gstin_failure_reason: gstResult.error || 'GSTIN verification failed', agency_gstin_api_response: gstResult.raw ?? Prisma.DbNull }
                });
                result.failed++;
                continue;
              }

              if (gstResult.current_registration_status !== 'Active') {
                await prisma.taxInformation.update({
                  where: { id: record.id },
                  data: { agency_gstin_status: 'FAILED', agency_gstin_failure_reason: `GSTIN registration is not active (status: ${gstResult.current_registration_status})`, agency_gstin_api_response: gstResult.raw ?? Prisma.DbNull }
                });
                result.failed++;
                continue;
              }
            }

            await prisma.taxInformation.update({
              where: { id: record.id },
              data: { agency_gstin_status: 'VERIFIED', agency_gstin_verified_at: new Date(), agency_gstin_failure_reason: null, agency_gstin_api_response: panResult.raw || null }
            });
            result.verified++;
          } catch (err: any) {
            result.errors.push(`Agency PAN/GSTIN (id ${record.id}): ${err.message}`);
            result.failed++;
          }
        }
      }
    } catch (error: any) {
      Log.error("[verify-gstin] Fatal error", { error: error.message });
      result.errors.push(error.message);
    }

    return result;
  }

  private static mapTaxInfo(taxInfo: any) {
    return {
      id: taxInfo.id,
      taxResidence: taxInfo.tax_residence,
      activeTab: taxInfo.entity_type === 'AGENCY' ? 'AGENCY' : 'INDIVIDUAL',
      individualName: taxInfo.individual_name || '',
      individualPAN: taxInfo.individual_pan || taxInfo.pan_number || '',
      individualHasGSTIN: !!(taxInfo.individual_gstin || (taxInfo.entity_type !== 'AGENCY' && taxInfo.gstin)),
      individualGSTIN: taxInfo.individual_gstin || (taxInfo.entity_type !== 'AGENCY' ? taxInfo.gstin || '' : ''),
      individualGstinStatus: taxInfo.individual_gstin_status || 'PENDING',
      individualGstinFailureReason: taxInfo.individual_gstin_failure_reason || null,
      agencyName: taxInfo.agency_name || '',
      agencyPAN: taxInfo.agency_pan || (taxInfo.entity_type === 'AGENCY' ? taxInfo.pan_number || '' : ''),
      agencyHasGSTIN: !!(taxInfo.agency_gstin || (taxInfo.entity_type === 'AGENCY' && taxInfo.gstin)),
      agencyGSTIN: taxInfo.agency_gstin || (taxInfo.entity_type === 'AGENCY' ? taxInfo.gstin || '' : ''),
      agencyGstinStatus: taxInfo.agency_gstin_status || 'PENDING',
      agencyGstinFailureReason: taxInfo.agency_gstin_failure_reason || null,
    };
  }
}

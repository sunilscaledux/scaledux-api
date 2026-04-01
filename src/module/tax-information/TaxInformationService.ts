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

    let verificationApiResponse: any = Prisma.DbNull;

    const entityLabel = activeTab === 'AGENCY' ? 'company/agency' : 'individual';

    // Real-time verification — must pass to save
    if (!activePAN) {
      return { success: false, message: `${entityLabel === 'company/agency' ? 'Company/Agency' : 'Individual'} PAN number is required.` };
    }

    if (!isIdtoaiConfigured()) {
      return { success: false, message: 'PAN verification service is temporarily unavailable. Please try again later.' };
    }

    if (activePAN) {
      // Verify PAN
      const panResult = await verifyPAN(activePAN, String(userIdNum));
      if (!panResult.success) {
        return { success: false, message: `PAN verification failed for ${activePAN}. Please check your ${entityLabel} PAN number.` };
      }

      // Match name with PAN
      if (panResult.full_name && activeName) {
        const panName = panResult.full_name.trim().toLowerCase();
        const userName = activeName.trim().toLowerCase();
        if (panName && userName && !panName.includes(userName) && !userName.includes(panName)) {
          return { success: false, message: `Name does not match PAN. Please ensure your ${entityLabel} name matches your PAN.` };
        }
      }

      verificationApiResponse = panResult.raw || Prisma.DbNull;

      // If GSTIN provided, verify that too
      if (activeGSTINValue) {
        const panGstinCheck = validatePanWithGSTIN(activePAN, activeGSTINValue);
        if (!panGstinCheck.matches) {
          return { success: false, message: `PAN and GSTIN do not match. Your ${entityLabel} PAN (${activePAN}) does not match the PAN embedded in GSTIN (${activeGSTINValue}). Please check both.` };
        }

        const gstResult = await verifyGSTIN(activeGSTINValue, String(userIdNum));
        if (!gstResult.success) {
          return { success: false, message: `GSTIN verification failed for ${activeGSTINValue}. Please check your ${entityLabel} GSTIN number.` };
        }

        if (gstResult.current_registration_status !== 'Active') {
          return { success: false, message: `GSTIN ${activeGSTINValue} is not active (status: ${gstResult.current_registration_status}). Only active GSTIN registrations are accepted.` };
        }

        // Match GSTIN legal name
        if (gstResult.legal_name_of_business && activeName) {
          const gstName = gstResult.legal_name_of_business.trim().toLowerCase();
          const userName = activeName.trim().toLowerCase();
          if (gstName && userName && !gstName.includes(userName) && !userName.includes(gstName)) {
            return { success: false, message: `Name does not match GSTIN. Please ensure your ${entityLabel} name matches your GSTIN.` };
          }
        }

        verificationApiResponse = gstResult.raw || panResult.raw || Prisma.DbNull;
      }
    }

    const statusField = activeTab === 'AGENCY' ? 'agency_gstin_status' : 'individual_gstin_status';
    const verifiedAtField = activeTab === 'AGENCY' ? 'agency_gstin_verified_at' : 'individual_gstin_verified_at';
    const failureField = activeTab === 'AGENCY' ? 'agency_gstin_failure_reason' : 'individual_gstin_failure_reason';
    const apiResponseField = activeTab === 'AGENCY' ? 'agency_gstin_api_response' : 'individual_gstin_api_response';

    // If we reach here, verification passed
    const verificationData = {
      [statusField]: 'VERIFIED',
      [verifiedAtField]: new Date(),
      [failureField]: null,
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
        ...verificationData,
      }
    });

    return {
      success: true,
      message: "Tax information verified and saved successfully",
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

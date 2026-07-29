import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { TaxInformationInput } from "./TaxInformationType";
import { verifyPAN, validatePanWithGSTIN, isConfigured as isIdtoaiConfigured } from "@services/idtoaiService";
import { getResubmitWindow } from "@utils/General";
import { appConfig } from "@config/app";
import { notifySensitiveUpdate } from "@utils/sensitiveUpdateNotifier";
import { isNameMatch } from "@utils/nameMatch";
import { checkNameAgainstVerifiedRecords } from "@module/verify/NameCheckService";

export class TaxInformationService {

  static async saveTaxInformation(userId: string, data: TaxInformationInput) {
    const userIdNum = parseInt(userId);
    const entityType = data.activeTab;
    const entityLabel = entityType === 'AGENCY' ? 'company/agency' : 'individual';

    if (entityType === 'AGENCY') {
      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { agency_verification_status: true }
      });
      if (user?.agency_verification_status !== 'APPROVED') {
        return { success: false, message: "You need to verify your agency before saving agency tax details." };
      }
    }

    // ── 15-day cooldown check ──
    const existing = await (prisma as any).taxInformation.findFirst({
      where: { user_id: userIdNum, entity_type: entityType }
    });
    if (existing && existing.gstin_status === 'VERIFIED' && existing.gstin_verified_at) {
      const cooldown = getResubmitWindow(existing.gstin_verified_at, appConfig.verification.taxCooldownDays);
      if (!cooldown.canSubmit) {
        return {
          success: false,
          message: `Tax information is verified and locked. You can update after ${cooldown.nextSubmitAllowedAt?.toISOString().split('T')[0]}.`
        };
      }
    }

    const name = data.name?.trim() || null;
    const panNumber = data.panNumber?.trim().toUpperCase() || null;
    const hasGSTIN = !!data.hasGSTIN;
    const gstin = hasGSTIN ? data.gstin?.trim().toUpperCase() || null : null;

    if (!panNumber) {
      return { success: false, message: "PAN number is required." };
    }

    // Name must match the identity / agency document before spending a PAN verification call
    const identityCheck = await checkNameAgainstVerifiedRecords(userIdNum, entityType, name || '', 'tax');
    if (!identityCheck.valid) {
      return { success: false, message: identityCheck.message! };
    }

    // ── PAN verification ──
    if (!isIdtoaiConfigured()) {
      return { success: false, message: "PAN verification service is temporarily unavailable. Please try again later." };
    }

    const panResult = await verifyPAN(panNumber, String(userIdNum));
    if (!panResult.success) {
      return { success: false, message: `PAN verification failed for ${panNumber}. Please check your ${entityLabel} PAN number.` };
    }

    // Match name with PAN
    if (!isNameMatch(name, panResult.full_name)) {
      return { success: false, message: `The ${entityLabel} name you entered does not match this PAN. Please enter it exactly as it appears on your PAN.` };
    }

    // ── GSTIN validation (local only, no API verification) ──
    if (gstin) {
      const panGstinCheck = validatePanWithGSTIN(panNumber, gstin);
      if (!panGstinCheck.matches) {
        return { success: false, message: panGstinCheck.reason || `PAN and GSTIN do not match. Please check both.` };
      }
    }

    const taxInfo = await (prisma as any).taxInformation.upsert({
      where: {
        user_id_entity_type: { user_id: userIdNum, entity_type: entityType }
      },
      update: {
        tax_residence: data.taxResidence,
        name,
        pan_number: panNumber,
        has_gstin: hasGSTIN,
        gstin,
        gstin_status: 'VERIFIED',
        gstin_verified_at: new Date(),
        gstin_failure_reason: null,
        gstin_api_response: panResult.raw || null,
        updated_at: new Date()
      },
      create: {
        user_id: userIdNum,
        entity_type: entityType,
        tax_residence: data.taxResidence,
        name,
        pan_number: panNumber,
        has_gstin: hasGSTIN,
        gstin,
        gstin_status: 'VERIFIED',
        gstin_verified_at: new Date(),
        gstin_api_response: panResult.raw || null,
      }
    });

    void notifySensitiveUpdate(
      userIdNum,
      'Your tax information was updated',
      `Your ${entityLabel} tax information (PAN${gstin ? ' and GSTIN' : ''}) on ScaleDux was updated.`,
    );

    return {
      success: true,
      message: "Tax information verified and saved successfully.",
      data: TaxInformationService.mapRecord(taxInfo)
    };
  }

  static async getTaxInformation(userId: string) {
    const userIdNum = parseInt(userId);
    const records = await (prisma as any).taxInformation.findMany({
      where: { user_id: userIdNum },
      orderBy: { created_at: 'desc' }
    });

    const individual = records.find((r: any) => r.entity_type === 'INDIVIDUAL') || null;
    const agency = records.find((r: any) => r.entity_type === 'AGENCY') || null;

    return {
      success: true,
      data: {
        individual: individual ? TaxInformationService.mapRecordWithCooldown(individual) : null,
        agency: agency ? TaxInformationService.mapRecordWithCooldown(agency) : null,
      }
    };
  }

  /** Mask PAN: show first 4 + last char, e.g. ABCDE1234F → ABCD*****F */
  private static maskPAN(pan: string): string {
    if (!pan || pan.length < 6) return pan ? '*'.repeat(pan.length) : '';
    return pan.slice(0, 4) + '*'.repeat(pan.length - 5) + pan.slice(-1);
  }

  /** Mask name: show first char of each word, e.g. John Doe → J*** D** */
  private static maskName(name: string): string {
    if (!name) return '';
    return name.split(/\s+/).map(w =>
      w.length <= 1 ? w : w[0] + '*'.repeat(w.length - 1)
    ).join(' ');
  }

  /** Mask GSTIN: show first 2 (state code) + last 3, e.g. 27ABCDE1234F1Z5 → 27**********Z5 */
  private static maskGSTIN(gstin: string): string {
    if (!gstin || gstin.length < 6) return gstin ? '*'.repeat(gstin.length) : '';
    return gstin.slice(0, 2) + '*'.repeat(gstin.length - 4) + gstin.slice(-2);
  }

  private static mapRecord(record: any, mask = false) {
    const name = record.name || '';
    const panNumber = record.pan_number || '';
    const gstin = record.gstin || '';

    return {
      id: record.id,
      entityType: record.entity_type,
      taxResidence: record.tax_residence,
      name: mask ? TaxInformationService.maskName(name) : name,
      panNumber: mask ? TaxInformationService.maskPAN(panNumber) : panNumber,
      hasGSTIN: !!record.has_gstin,
      gstin: mask && gstin ? TaxInformationService.maskGSTIN(gstin) : gstin,
      gstinStatus: record.gstin_status || 'PENDING',
      gstinFailureReason: record.gstin_failure_reason || null,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  private static mapRecordWithCooldown(record: any) {
    const isVerified = record.gstin_status === 'VERIFIED';
    const base = TaxInformationService.mapRecord(record, isVerified);
    const cooldown = getResubmitWindow(record.gstin_verified_at, appConfig.verification.taxCooldownDays);
    return {
      ...base,
      isVerified,
      verifiedMessage: isVerified ? 'Tax information verified' : null,
      canEdit: !isVerified || cooldown.canSubmit,
      nextEditAllowedAt: cooldown.nextSubmitAllowedAt,
      cooldownDays: appConfig.verification.taxCooldownDays,
    };
  }
}

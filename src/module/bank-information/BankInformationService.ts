import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { verifyBankAccount, isConfigured as isIdtoaiConfigured } from "@services/idtoaiService";
import { CreateBankInformationInput, UpdateBankInformationInput } from "./BankInformationType";
import { getResubmitWindow } from "@utils/General";
import { appConfig } from "@config/app";

export class BankInformationService {

  static async getBankInformation(userId: string) {
    const userIdNum = parseInt(userId);
    const records = await (prisma as any).bankInformation.findMany({
      where: { user_id: userIdNum },
      orderBy: { created_at: 'desc' }
    });

    const individual = records.find((m: any) => m.entity_type === 'INDIVIDUAL') || null;
    const agency = records.find((m: any) => m.entity_type === 'AGENCY') || null;

    return {
      success: true,
      data: {
        individual: individual ? BankInformationService.mapRecordWithCooldown(individual) : null,
        agency: agency ? BankInformationService.mapRecordWithCooldown(agency) : null,
      }
    };
  }

  private static mapRecord(m: any) {
    return {
      id: m.id,
      uniqueId: m.unique_id,
      type: m.type,
      entityType: m.entity_type || 'INDIVIDUAL',
      displayLabel: m.display_label,
      bankName: m.bank_name,
      accountHolderName: m.account_holder_name || null,
      accountNumberLast4: m.account_number_last4,
      ifsc: m.ifsc,
      verificationStatus: m.verification_status ?? 'pending',
      verificationFailureReason: m.verification_failure_reason ?? null,
      verifiedAt: m.verified_at || null,
      createdAt: m.created_at
    };
  }

  private static mapRecordWithCooldown(m: any) {
    const base = BankInformationService.mapRecord(m);
    const isVerified = m.verification_status === 'verified';
    const cooldown = getResubmitWindow(m.verified_at, appConfig.verification.bankCooldownDays);
    return {
      ...base,
      isVerified,
      verifiedMessage: isVerified ? 'Bank information verified' : null,
      canEdit: !isVerified || cooldown.canSubmit,
      nextEditAllowedAt: cooldown.nextSubmitAllowedAt,
      cooldownDays: appConfig.verification.bankCooldownDays,
    };
  }

  /**
   * Verify bank account via IDtoAI pennyless verification, then save on success.
   */
  static async createBankInformation(userId: string, data: CreateBankInformationInput) {
    const userIdNum = parseInt(userId);
    if (data.type && data.type !== 'bank_account') {
      return { success: false, message: 'Only bank account is supported. UPI is not available.' };
    }
    if (!data.accountNumber?.trim()) {
      return { success: false, message: 'Bank account number is required' };
    }
    const ifsc = (data.ifsc || '').trim().toUpperCase();
    if (!ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      return { success: false, message: 'Valid IFSC is required (e.g. HDFC0001234)' };
    }

    const entityType = data.entityType || 'INDIVIDUAL';

    if (entityType === 'AGENCY') {
      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { agency_verification_status: true }
      });
      if (user?.agency_verification_status !== 'APPROVED') {
        return { success: false, message: 'You need to verify your agency before adding agency bank details.' };
      }
    }

    const existing = await (prisma as any).bankInformation.findFirst({
      where: { user_id: userIdNum, entity_type: entityType }
    });
    if (existing) {
      return { success: false, message: `You already have ${entityType.toLowerCase()} bank information. Please edit the existing details instead.` };
    }

    // Note: cooldown check not needed for create since we block if record exists

    const accountNumber = data.accountNumber.replace(/\D/g, '').trim() || null;
    if (!accountNumber || accountNumber.length < 9) {
      return { success: false, message: 'Valid account number (at least 9 digits) is required.' };
    }
    const accountNumberLast4 = accountNumber.slice(-4);

    let accountHolderName = data.accountHolderName?.trim() || null;
    if (!accountHolderName) {
      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { first_name: true, last_name: true }
      });
      accountHolderName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || data.displayLabel;
    }

    // Verify via IDtoAI pennyless bank verification
    if (!isIdtoaiConfigured()) {
      return { success: false, message: 'Bank verification service is temporarily unavailable. Please try again later.' };
    }

    const verification = await verifyBankAccount(accountNumber, ifsc, String(userIdNum));
    if (!verification.success) {
      Log.error(`Bank verification failed for user ${userIdNum}`, { error: verification.error, raw: JSON.stringify(verification.raw) });
      return { success: false, message: verification.error || 'Bank account verification failed. Please check your details.' };
    }

    // Use verified account holder name from bank if available
    const verifiedName = verification.accountHolderName || accountHolderName;
    const verifiedBankName = verification.bankName || data.bankName || null;

    const record = await (prisma as any).bankInformation.create({
      data: {
        user_id: userIdNum,
        type: 'bank_account',
        entity_type: entityType,
        display_label: data.displayLabel,
        bank_name: verifiedBankName,
        account_number: accountNumber,
        account_number_last4: accountNumberLast4,
        account_holder_name: verifiedName,
        ifsc,
        verification_status: 'verified',
        verified_at: new Date(),
      }
    });

    return {
      success: true,
      message: 'Bank account verified and saved successfully.',
      data: BankInformationService.mapRecord(record)
    };
  }

  static async resubmitForVerification(userId: string, entityType?: string): Promise<{ success: boolean; message: string; data?: any }> {
    const userIdNum = parseInt(userId);
    const where: any = { user_id: userIdNum };
    if (entityType) where.entity_type = entityType;
    const record = await (prisma as any).bankInformation.findFirst({ where });
    if (!record) {
      return { success: false, message: 'No bank account found. Add bank details first.' };
    }
    if (record.verification_status !== 'failed') {
      return { success: false, message: 'Only failed verification can be resubmitted.' };
    }

    if (!isIdtoaiConfigured()) {
      return { success: false, message: 'Bank verification service is temporarily unavailable. Please try again later.' };
    }

    const accountNumber = (record.account_number || '').trim();
    const ifsc = (record.ifsc || '').trim().toUpperCase();
    if (!accountNumber || accountNumber.length < 9 || !ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      return { success: false, message: 'Missing or invalid account number or IFSC. Please edit your bank details and try again.' };
    }

    const verification = await verifyBankAccount(accountNumber, ifsc, String(userIdNum));
    if (!verification.success) {
      const reason = String(verification.error || 'Verification failed').slice(0, 500);
      await (prisma as any).bankInformation.update({
        where: { id: record.id },
        data: { verification_status: 'failed', verification_failure_reason: reason }
      }).catch(() => {});
      return { success: false, message: reason };
    }

    await (prisma as any).bankInformation.update({
      where: { id: record.id },
      data: {
        account_holder_name: verification.accountHolderName || record.account_holder_name,
        bank_name: verification.bankName || record.bank_name,
        verification_status: 'verified',
        verification_failure_reason: null,
        verified_at: new Date(),
      }
    });

    return {
      success: true,
      message: 'Bank account verified successfully.',
      data: { id: record.id, verificationStatus: 'verified', verificationFailureReason: null }
    };
  }

  static async updateBankInformation(
    userId: string,
    recordId: string,
    data: UpdateBankInformationInput
  ): Promise<{ success: boolean; message: string; data?: any }> {
    const userIdNum = parseInt(userId);
    const recordIdNum = parseInt(recordId);
    const record = await (prisma as any).bankInformation.findFirst({
      where: { id: recordIdNum, user_id: userIdNum }
    });
    if (!record) {
      return { success: false, message: 'Bank information not found.' };
    }

    // ── 15-day cooldown check ──
    if (record.verification_status === 'verified' && record.verified_at) {
      const cooldown = getResubmitWindow(record.verified_at, appConfig.verification.bankCooldownDays);
      if (!cooldown.canSubmit) {
        return {
          success: false,
          message: `Bank information is verified and locked. You can update after ${cooldown.nextSubmitAllowedAt?.toISOString().split('T')[0]}.`
        };
      }
    }

    const ifsc = data.ifsc != null ? String(data.ifsc).trim().toUpperCase() : record.ifsc;
    if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      return { success: false, message: 'Valid IFSC is required (e.g. HDFC0001234)' };
    }

    const newAccountNumber = data.accountNumber != null ? data.accountNumber.replace(/\D/g, '').trim() : null;
    const displayLabel = data.displayLabel?.trim() ?? record.display_label;
    const accountHolderName = data.accountHolderName?.trim() ?? record.account_holder_name;
    const bankName = data.bankName?.trim() ?? record.bank_name;

    // Check if account number or IFSC changed — only re-verify if they did
    const accountChanged = newAccountNumber && newAccountNumber !== record.account_number;
    const ifscChanged = ifsc !== record.ifsc;
    const needsReverification = accountChanged || ifscChanged;

    if (needsReverification) {
      const accountNumber = newAccountNumber || record.account_number;
      if (!accountNumber || accountNumber.length < 9) {
        return { success: false, message: 'Valid account number (at least 9 digits) is required.' };
      }

      if (!isIdtoaiConfigured()) {
        return { success: false, message: 'Bank verification service is temporarily unavailable. Please try again later.' };
      }

      const verification = await verifyBankAccount(accountNumber, ifsc, String(userIdNum));
      if (!verification.success) {
        const reason = String(verification.error || 'Verification failed').slice(0, 500);
        await (prisma as any).bankInformation.update({
          where: { id: recordIdNum },
          data: { verification_status: 'failed', verification_failure_reason: reason }
        }).catch(() => {});
        return { success: false, message: reason };
      }

      const verifiedName = verification.accountHolderName || accountHolderName;
      const verifiedBankName = verification.bankName || bankName;
      const accountNumberLast4 = accountNumber.slice(-4);

      await prisma.$executeRaw`
        UPDATE scd_bank_information
        SET display_label = ${displayLabel}, bank_name = ${verifiedBankName}, account_number = ${accountNumber},
            account_number_last4 = ${accountNumberLast4}, ifsc = ${ifsc},
            account_holder_name = ${verifiedName},
            verification_status = 'verified', verification_failure_reason = NULL,
            verified_at = NOW(), updated_at = NOW()
        WHERE id = ${recordIdNum} AND user_id = ${userIdNum}
      `;
    } else {
      // Only label/name/bank name changed — no re-verification needed
      await (prisma as any).bankInformation.update({
        where: { id: recordIdNum },
        data: {
          display_label: displayLabel,
          bank_name: bankName,
          account_holder_name: accountHolderName,
        }
      });
    }

    const updated = await (prisma as any).bankInformation.findUnique({
      where: { id: recordIdNum }
    });
    return {
      success: true,
      message: needsReverification ? 'Bank account verified and updated successfully.' : 'Bank details updated successfully.',
      data: updated ? BankInformationService.mapRecord(updated) : undefined
    };
  }
}

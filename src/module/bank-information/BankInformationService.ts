import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { createContactAndFundAccount, isRazorpayConfigured } from "@services/razorpayService";
import { CreateBankInformationInput, UpdateBankInformationInput } from "./BankInformationType";

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
        individual: individual ? BankInformationService.mapRecord(individual) : null,
        agency: agency ? BankInformationService.mapRecord(agency) : null,
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
      return { success: false, message: `You already have ${entityType.toLowerCase()} bank information. Remove it first to add new details.` };
    }

    const accountNumber = data.accountNumber.replace(/\D/g, '').trim() || null;
    const accountNumberLast4 = accountNumber ? accountNumber.slice(-4) : (data.accountNumberLast4?.replace(/\D/g, '').slice(-4) || null);

    let accountHolderName = data.accountHolderName?.trim() || null;
    if (!accountHolderName) {
      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { first_name: true, last_name: true }
      });
      accountHolderName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || data.displayLabel;
    }

    const record = await (prisma as any).bankInformation.create({
      data: {
        user_id: userIdNum,
        type: 'bank_account',
        entity_type: entityType,
        display_label: data.displayLabel,
        bank_name: data.bankName ?? null,
        account_number: accountNumber,
        account_number_last4: accountNumberLast4,
        account_holder_name: accountHolderName,
        ifsc,
        verification_status: 'pending'
      }
    });
    return {
      success: true,
      message: 'Bank details submitted. Verification is in process.',
      data: BankInformationService.mapRecord(record)
    };
  }

  static async deleteBankInformation(userId: string, recordId: string) {
    const userIdNum = parseInt(userId);
    const recordIdNum = parseInt(recordId);
    const record = await (prisma as any).bankInformation.findFirst({
      where: { id: recordIdNum, user_id: userIdNum }
    });
    if (record) {
      await (prisma as any).user.update({
        where: { id: userIdNum },
        data: { razorpay_account_id: null }
      });
    }
    await (prisma as any).bankInformation.deleteMany({
      where: { id: recordIdNum, user_id: userIdNum }
    });
    return { success: true, message: 'Bank information removed' };
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
    await prisma.$executeRaw`
      UPDATE scd_bank_information
      SET verification_status = 'pending', verification_failure_reason = NULL, updated_at = NOW()
      WHERE id = ${record.id} AND user_id = ${userIdNum}
    `;
    return {
      success: true,
      message: 'Resubmitted for verification. We will verify your bank account shortly.',
      data: {
        id: record.id,
        verificationStatus: 'pending',
        verificationFailureReason: null,
      }
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
    if (record.verification_status !== 'failed') {
      return { success: false, message: 'Only failed bank details can be edited. Remove and add again to change verified details.' };
    }
    const ifsc = data.ifsc != null ? String(data.ifsc).trim().toUpperCase() : record.ifsc;
    if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      return { success: false, message: 'Valid IFSC is required (e.g. HDFC0001234)' };
    }
    const accountNumber = data.accountNumber != null ? data.accountNumber.replace(/\D/g, '').trim() : record.account_number;
    if (!accountNumber || accountNumber.length < 9) {
      return { success: false, message: 'Valid account number (at least 9 digits) is required.' };
    }
    const accountNumberLast4 = accountNumber.slice(-4);
    const displayLabel = data.displayLabel?.trim() ?? record.display_label;
    const bankName = data.bankName?.trim() ?? record.bank_name;
    const accountHolderName = data.accountHolderName?.trim() ?? record.account_holder_name;
    await prisma.$executeRaw`
      UPDATE scd_bank_information
      SET display_label = ${displayLabel}, bank_name = ${bankName}, account_number = ${accountNumber},
          account_number_last4 = ${accountNumberLast4}, ifsc = ${ifsc},
          account_holder_name = ${accountHolderName},
          verification_status = 'pending', verification_failure_reason = NULL, updated_at = NOW()
      WHERE id = ${recordIdNum} AND user_id = ${userIdNum}
    `;
    const updated = await (prisma as any).bankInformation.findUnique({
      where: { id: recordIdNum }
    });
    return {
      success: true,
      message: 'Bank details updated. Verification is in process.',
      data: updated ? BankInformationService.mapRecord(updated) : undefined
    };
  }

  /**
   * Cron: verify pending bank accounts via Razorpay X (contact + fund account).
   */
  static async verifyPendingBankAccounts(): Promise<{ verified: number; failed: number; errors: string[] }> {
    const result = { verified: 0, failed: 0, errors: [] as string[] };
    if (!isRazorpayConfigured()) {
      result.errors.push("Razorpay not configured");
      return result;
    }
    const pending = await (prisma as any).bankInformation.findMany({
      where: { verification_status: "pending", type: "bank_account" },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            razorpay_contact_id: true,
          },
        },
      },
      take: 20,
    });
    for (const record of pending) {
      const accountNumber = (record.account_number || "").trim();
      const ifsc = (record.ifsc || "").trim().toUpperCase();
      if (!accountNumber || accountNumber.length < 9 || !ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
        const reason = "Missing or invalid account number or IFSC. Please check and resubmit.";
        await (prisma as any).bankInformation.update({
          where: { id: record.id },
          data: { verification_status: "failed", verification_failure_reason: reason }
        });
        result.failed++;
        result.errors.push(`BankInformation ${record.id}: missing or invalid account_number/ifsc`);
        continue;
      }
      const u = record.user;
      const name = record.account_holder_name
        || [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim()
        || record.display_label
        || "Account Holder";
      const email = (u?.email || "").trim() || `user-${record.user_id}@scaledux.placeholder`;
      const contact = (u?.phone || "").replace(/\D/g, "").slice(-10) || "0000000000";
      try {
        const existingContactId = (u as any).razorpay_contact_id ?? null;
        const { contactId, fundAccountId } = await createContactAndFundAccount({
          name,
          email,
          contact,
          ifsc,
          accountNumber,
          existingContactId: existingContactId || undefined,
          validateBeneficiaryName: true,
        });
        await (prisma as any).bankInformation.update({
          where: { id: record.id },
          data: {
            razorpay_fund_account_id: fundAccountId,
            verification_status: "verified",
            verification_failure_reason: null,
            verified_at: new Date(),
          }
        });
        await (prisma as any).user.update({
          where: { id: record.user_id },
          data: {
            razorpay_account_id: fundAccountId,
            ...(contactId && !existingContactId ? { razorpay_contact_id: contactId } : {}),
          }
        });
        result.verified++;
      } catch (err: any) {
        const msg = err?.response?.data?.error?.description || err?.message || "Unknown error";
        const reason = String(msg).slice(0, 500);
        await (prisma as any).bankInformation.update({
          where: { id: record.id },
          data: { verification_status: "failed", verification_failure_reason: reason }
        }).catch(() => {});
        result.failed++;
        result.errors.push(`BankInformation ${record.id}: ${msg}`);
      }
    }
    return result;
  }
}

import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { verifyBankAccount, isConfigured as isIdtoaiConfigured } from "@services/idtoaiService";
import { createRouteLinkedAccount, isRazorpayConfigured, checkRazorpayEmailStatus, getRouteAccountActivationStatus } from "@services/razorpayService";
import { CreateBankInformationInput, UpdateBankInformationInput } from "./BankInformationType";
import { getResubmitWindow } from "@utils/General";
import { appConfig } from "@config/app";
import { notifySensitiveUpdate } from "@utils/sensitiveUpdateNotifier";
import { generateAndSendOtp, verifyOtpByType, OTP_TYPES } from "@module/auth/AuthService";

/** Bank name and account holder name: letters and spaces only. */
const BANK_NAME_PATTERN = /^[A-Za-z ]+$/;

/** Trim and collapse internal whitespace. */
const cleanName = (v?: string | null) =>
  (v ?? '').trim().replace(/\s+/g, ' ');

export class BankInformationService {

  static async getBankInformation(userId: string) {
    const userIdNum = parseInt(userId);
    const [records, user] = await Promise.all([
      (prisma as any).bankInformation.findMany({
        where: { user_id: userIdNum },
        orderBy: { created_at: 'desc' }
      }),
      prisma.user.findUnique({ where: { id: userIdNum }, select: { email: true } }),
    ]);

    let individual = records.find((m: any) => m.entity_type === 'INDIVIDUAL') || null;
    let agency = records.find((m: any) => m.entity_type === 'AGENCY') || null;

    // Refresh activation status from Razorpay for records still in_review after 5 minutes
    if (individual || agency) {
      const userRecord = await (prisma as any).user.findUnique({
        where: { id: userIdNum },
        select: { razorpay_account_id: true, razorpay_agency_account_id: true },
      });
      const reviewMs = 5 * 60 * 1000; // 5 minutes
      const refreshTasks: Promise<void>[] = [];
      for (const [rec, accId] of [
        [individual, userRecord?.razorpay_account_id],
        [agency, userRecord?.razorpay_agency_account_id],
      ] as [any, string | null][]) {
        if (!rec || !accId) continue;
        const status = rec.razorpay_activation_status;
        // Only check Razorpay if still in_review and 5+ minutes have passed since verification
        if (status === 'in_review') {
          const verifiedAt = rec.verified_at ? new Date(rec.verified_at).getTime() : 0;
          if (Date.now() - verifiedAt >= reviewMs) {
            refreshTasks.push(
              getRouteAccountActivationStatus(accId).then(async (rpStatus) => {
                const newStatus = rpStatus === 'activated' ? 'activated' : 'failed';
                await (prisma as any).bankInformation.update({
                  where: { id: rec.id },
                  data: { razorpay_activation_status: newStatus },
                });
                rec.razorpay_activation_status = newStatus;
              }).catch(() => {})
            );
          }
        }
      }
      if (refreshTasks.length > 0) await Promise.all(refreshTasks);
    }

    return {
      success: true,
      data: {
        defaultEmail: user?.email || null,
        individual: individual ? BankInformationService.mapRecordWithCooldown(individual) : null,
        agency: agency ? BankInformationService.mapRecordWithCooldown(agency) : null,
      }
    };
  }

  /** Mask name: show first char of each word, e.g. John Doe → J*** D** */
  private static maskName(name: string): string {
    if (!name) return '';
    return name.split(/\s+/).map(w =>
      w.length <= 1 ? w : w[0] + '*'.repeat(w.length - 1)
    ).join(' ');
  }

  /** Mask IFSC: show first 4 (bank code) + mask rest, e.g. HDFC0001234 → HDFC******* */
  private static maskIFSC(ifsc: string): string {
    if (!ifsc || ifsc.length < 5) return ifsc || '';
    return ifsc.slice(0, 4) + '*'.repeat(ifsc.length - 4);
  }

  private static mapRecord(m: any, mask = false) {
    const accountHolderName = m.account_holder_name || null;
    const ifsc = m.ifsc || '';

    return {
      id: m.id,
      uniqueId: m.unique_id,
      type: m.type,
      entityType: m.entity_type || 'INDIVIDUAL',
      displayLabel: m.display_label,
      bankName: m.bank_name,
      accountHolderName: mask && accountHolderName ? BankInformationService.maskName(accountHolderName) : accountHolderName,
      accountNumberLast4: m.account_number_last4,
      ifsc: mask ? BankInformationService.maskIFSC(ifsc) : ifsc,
      verificationStatus: m.verification_status ?? 'pending',
      verificationFailureReason: m.verification_failure_reason ?? null,
      razorpayEmail: m.razorpay_email || null,
      razorpayActivationStatus: m.razorpay_activation_status || null,
      verifiedAt: m.verified_at || null,
      createdAt: m.created_at
    };
  }

  private static mapRecordWithCooldown(m: any) {
    const isVerified = m.verification_status === 'verified';
    const base = BankInformationService.mapRecord(m, isVerified);
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
   * Send OTP to an email for bank information verification.
   * Email can differ from user's ScaleDux email but must be unique across all bank records.
   */
  static async sendEmailOtp(userId: number, email?: string): Promise<{ success: boolean; message: string }> {
    if (!email?.trim()) {
      // Default to user's registered email
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      email = user?.email || undefined;
    }
    if (!email?.trim()) {
      return { success: false, message: 'Email is required.' };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check uniqueness: email must not be used by another user's bank record
    const existing = await (prisma as any).bankInformation.findFirst({
      where: { razorpay_email: normalizedEmail, user_id: { not: userId } }
    });
    if (existing) {
      return { success: false, message: 'This email is already linked to another account. Please use a different email.' };
    }

    // Check Razorpay: if this email already has a suspended account, block early
    if (isRazorpayConfigured()) {
      const razorpayStatus = await checkRazorpayEmailStatus(normalizedEmail);
      if (razorpayStatus.status === 'suspended') {
        return { success: false, message: 'This email has a suspended payment account on ScaleDux. Please use a different email to add your bank account.' };
      }
    }

    const result = await generateAndSendOtp({
      email: normalizedEmail,
      otpType: OTP_TYPES.BANK_EMAIL_VERIFICATION,
      userId,
    });

    return { success: result.success, message: result.message };
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

    const cleanedBankName = cleanName(data.bankName);
    if (cleanedBankName && !BANK_NAME_PATTERN.test(cleanedBankName)) {
      return { success: false, message: 'Bank name can only contain letters and spaces' };
    }
    const cleanedHolderName = cleanName(data.accountHolderName);
    if (cleanedHolderName && !BANK_NAME_PATTERN.test(cleanedHolderName)) {
      return { success: false, message: 'Account holder name can only contain letters and spaces' };
    }

    const entityType = data.entityType || 'INDIVIDUAL';

    // ── Email OTP verification ──
    if (!data.otpCode?.trim()) {
      return { success: false, message: 'Email OTP is required. Please verify your email first.' };
    }

    // Resolve email: use provided or default to user's ScaleDux email
    let razorpayEmail = data.email?.trim().toLowerCase() || null;
    if (!razorpayEmail) {
      const user = await prisma.user.findUnique({ where: { id: userIdNum }, select: { email: true } });
      razorpayEmail = user?.email?.toLowerCase() || null;
    }
    if (!razorpayEmail) {
      return { success: false, message: 'Email is required for bank verification.' };
    }

    // Verify the OTP
    const otpResult = await verifyOtpByType(razorpayEmail, data.otpCode.trim(), OTP_TYPES.BANK_EMAIL_VERIFICATION);
    if (!otpResult.success) {
      return { success: false, message: otpResult.message || 'Invalid or expired OTP.' };
    }

    // Check email uniqueness across other users
    const emailTaken = await (prisma as any).bankInformation.findFirst({
      where: { razorpay_email: razorpayEmail, user_id: { not: userIdNum } }
    });
    if (emailTaken) {
      return { success: false, message: 'This email is already linked to another account. Please use a different email.' };
    }

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

    let accountHolderName = cleanedHolderName || null;
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

    // Validate account holder name matches bank records
    if (accountHolderName && verification.accountHolderName) {
      const submittedName = accountHolderName.trim().toLowerCase();
      const bankName = verification.accountHolderName.trim().toLowerCase();
      if (submittedName && bankName && !bankName.includes(submittedName) && !submittedName.includes(bankName)) {
        return {
          success: false,
          message: 'Account holder name does not match bank records. Please enter the name exactly as registered with your bank.'
        };
      }
    }

    // Use verified account holder name from bank if available
    const verifiedName = verification.accountHolderName || accountHolderName;
    const verifiedBankName = verification.bankName || cleanedBankName || null;

    // Create Razorpay Route linked account BEFORE saving bank info
    const razorpayResult = await BankInformationService.ensureRazorpayLinkedAccount(userIdNum, entityType, {
      name: verifiedName || data.displayLabel || 'User',
      ifsc,
      accountNumber,
    }, razorpayEmail);

    if (!razorpayResult.success) {
      void notifySensitiveUpdate(
        userIdNum,
        'Bank verification failed',
        `Your ${entityType.toLowerCase()} bank account ending in ${accountNumberLast4} was verified, but payment account setup failed: ${razorpayResult.error}. Please try again or contact support.`,
      );
      return {
        success: false,
        message: `Bank verified but payment account setup failed: ${razorpayResult.error}`
      };
    }

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
        razorpay_email: razorpayEmail,
        razorpay_activation_status: 'in_review',
        verification_status: 'verified',
        verified_at: new Date(),
      }
    });

    void notifySensitiveUpdate(
      userIdNum,
      'Your bank details were updated',
      `A new ${entityType.toLowerCase()} bank account ending in ${accountNumberLast4} (${verifiedBankName || 'bank'}) was added to your ScaleDux account.`,
    );

    return {
      success: true,
      message: 'Bank account verified and saved. Your payment account is under review and will be activated shortly.',
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

    // Re-create Razorpay Route linked account before saving
    const razorpayResult = await BankInformationService.ensureRazorpayLinkedAccount(userIdNum, record.entity_type, {
      name: verification.accountHolderName || record.account_holder_name || 'User',
      ifsc,
      accountNumber,
    }, record.razorpay_email);

    if (!razorpayResult.success) {
      void notifySensitiveUpdate(
        userIdNum,
        'Bank verification failed',
        `Your bank account was verified, but payment account setup failed: ${razorpayResult.error}. Please try again or contact support.`,
      );
      return { success: false, message: `Bank verified but payment account setup failed: ${razorpayResult.error}` };
    }

    await (prisma as any).bankInformation.update({
      where: { id: record.id },
      data: {
        account_holder_name: verification.accountHolderName || record.account_holder_name,
        bank_name: verification.bankName || record.bank_name,
        razorpay_activation_status: 'in_review',
        verification_status: 'verified',
        verification_failure_reason: null,
        verified_at: new Date(),
      }
    });

    return {
      success: true,
      message: 'Bank account verified. Your payment account is under review and will be activated shortly.',
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

    // ── Email change with OTP verification ──
    const newEmail = data.email?.trim().toLowerCase() || null;
    const emailChanging = newEmail && newEmail !== record.razorpay_email;
    if (emailChanging) {
      if (!data.otpCode?.trim()) {
        return { success: false, message: 'Email OTP is required to change the Razorpay email.' };
      }
      const otpResult = await verifyOtpByType(newEmail, data.otpCode.trim(), OTP_TYPES.BANK_EMAIL_VERIFICATION);
      if (!otpResult.success) {
        return { success: false, message: otpResult.message || 'Invalid or expired OTP.' };
      }
      const emailTaken = await (prisma as any).bankInformation.findFirst({
        where: { razorpay_email: newEmail, user_id: { not: userIdNum } }
      });
      if (emailTaken) {
        return { success: false, message: 'This email is already linked to another account. Please use a different email.' };
      }
    }

    const ifsc = data.ifsc != null ? String(data.ifsc).trim().toUpperCase() : record.ifsc;
    if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      return { success: false, message: 'Valid IFSC is required (e.g. HDFC0001234)' };
    }

    const newAccountNumber = data.accountNumber != null ? data.accountNumber.replace(/\D/g, '').trim() : null;
    const displayLabel = data.displayLabel?.trim() ?? record.display_label;

    const incomingHolderName = data.accountHolderName != null ? cleanName(data.accountHolderName) : null;
    if (incomingHolderName && !BANK_NAME_PATTERN.test(incomingHolderName)) {
      return { success: false, message: 'Account holder name can only contain letters and spaces' };
    }
    const accountHolderName = incomingHolderName ?? record.account_holder_name;

    const incomingBankName = data.bankName != null ? cleanName(data.bankName) : null;
    if (incomingBankName && !BANK_NAME_PATTERN.test(incomingBankName)) {
      return { success: false, message: 'Bank name can only contain letters and spaces' };
    }
    const bankName = incomingBankName ?? record.bank_name;

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

      // Create Razorpay Route linked account before saving bank details
      const razorpayResult = await BankInformationService.ensureRazorpayLinkedAccount(userIdNum, record.entity_type, {
        name: verifiedName || 'User',
        ifsc,
        accountNumber,
      }, emailChanging ? newEmail : record.razorpay_email);

      if (!razorpayResult.success) {
        void notifySensitiveUpdate(
          userIdNum,
          'Bank update failed',
          `Your bank account was verified, but payment account setup failed: ${razorpayResult.error}. Please try again or contact support.`,
        );
        return { success: false, message: `Bank verified but payment account setup failed: ${razorpayResult.error}` };
      }

      const updatedEmail = emailChanging ? newEmail : record.razorpay_email;
      await prisma.$executeRaw`
        UPDATE scd_bank_information
        SET display_label = ${displayLabel}, bank_name = ${verifiedBankName}, account_number = ${accountNumber},
            account_number_last4 = ${accountNumberLast4}, ifsc = ${ifsc},
            account_holder_name = ${verifiedName}, razorpay_email = ${updatedEmail},
            razorpay_activation_status = 'in_review',
            verification_status = 'verified', verification_failure_reason = NULL,
            verified_at = NOW(), updated_at = NOW()
        WHERE id = ${recordIdNum} AND user_id = ${userIdNum}
      `;
    } else {
      // Only label/name/bank name/email changed — no re-verification needed
      const updateData: any = {
        display_label: displayLabel,
        bank_name: bankName,
        account_holder_name: accountHolderName,
      };
      if (emailChanging) updateData.razorpay_email = newEmail;
      await (prisma as any).bankInformation.update({
        where: { id: recordIdNum },
        data: updateData,
      });
    }

    const updated = await (prisma as any).bankInformation.findUnique({
      where: { id: recordIdNum }
    });

    const last4 = updated?.account_number_last4 || record.account_number_last4;
    void notifySensitiveUpdate(
      userIdNum,
      'Your bank details were updated',
      `Your ${(updated?.entity_type || record.entity_type || '').toLowerCase()} bank account (ending in ${last4}) on ScaleDux was updated.`,
    );

    return {
      success: true,
      message: needsReverification ? 'Bank account verified and updated successfully.' : 'Bank details updated successfully.',
      data: updated ? BankInformationService.mapRecord(updated) : undefined
    };
  }

  /**
   * Create Razorpay Route linked account after bank verification
   * and store the account ID on the user so Route transfers work for bookings/proposals.
   * Stores in `razorpay_account_id` for INDIVIDUAL or `razorpay_agency_account_id` for AGENCY.
   */
  private static async ensureRazorpayLinkedAccount(
    userId: number,
    entityType: string,
    bank: { name: string; ifsc: string; accountNumber: string },
    razorpayEmail?: string | null,
  ): Promise<{ success: boolean; error?: string; activationStatus?: string }> {
    if (!isRazorpayConfigured()) {
      Log.warn(`[ensureRazorpayLinkedAccount] Razorpay not configured — skipping for user ${userId}`);
      return { success: false, error: 'Payment service is not configured. Please contact support.' };
    }

    const isAgency = entityType === 'AGENCY';
    const field = isAgency ? 'razorpay_agency_account_id' : 'razorpay_account_id';

    try {
      const user = await (prisma as any).user.findUnique({
        where: { id: userId },
        select: {
          email: true, phone: true, razorpay_account_id: true, razorpay_agency_account_id: true,
          first_name: true, last_name: true,
          personalInfo: {
            select: { address: true, address_line_2: true, city: true, zipCode: true, state: { select: { name: true } } }
          }
        }
      });
      if (!user) {
        Log.warn(`[ensureRazorpayLinkedAccount] User ${userId} not found — skipping`);
        return { success: false, error: 'User not found.' };
      }
      // Use razorpay_email (from bank record) if provided, otherwise fall back to user's ScaleDux email
      const emailForRazorpay = razorpayEmail || user.email;
      if (!emailForRazorpay) {
        Log.warn(`[ensureRazorpayLinkedAccount] No email for user ${userId} — skipping`);
        return { success: false, error: 'Email not found. Please provide an email for Razorpay.' };
      }
      const existingId = isAgency ? user.razorpay_agency_account_id : user.razorpay_account_id;

      // Fetch PAN from tax information
      const taxInfo = await (prisma as any).taxInformation.findFirst({
        where: { user_id: userId, entity_type: entityType },
        select: { pan_number: true }
      });

      const fullName = bank.name || [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';
      const info = user.personalInfo;
      const pan = taxInfo?.pan_number || undefined;

      Log.info(`[ensureRazorpayLinkedAccount] ${existingId ? 'Updating' : 'Creating'} Route linked account for user ${userId} (${entityType}), name: ${fullName}`);

      const result = await createRouteLinkedAccount({
        email: emailForRazorpay,
        phone: user?.phone || undefined,
        legalBusinessName: fullName,
        businessType: isAgency ? 'not_yet_registered' : 'individual',
        pan,
        existingAccountId: existingId || undefined,
        address: info ? {
          street1: info.address || undefined,
          street2: info.address_line_2 || undefined,
          city: info.city || undefined,
          state: info.state?.name || undefined,
          postalCode: info.zipCode || undefined,
        } : undefined,
        stakeholder: { name: fullName, email: emailForRazorpay, phone: user?.phone || undefined, pan },
        bankAccount: { name: fullName, ifsc: bank.ifsc, accountNumber: bank.accountNumber },
      });

      if (!existingId) {
        await (prisma as any).user.update({
          where: { id: userId },
          data: { [field]: result.accountId }
        });
      }

      Log.info(`[ensureRazorpayLinkedAccount] ${existingId ? 'Updated' : 'Created'} ${result.accountId} for user ${userId} (${entityType})`, {
        activationStatus: result.activationStatus,
      });
      return { success: true, activationStatus: result.activationStatus };
    } catch (err: any) {
      const razorpayError = err?.response?.data?.error?.description || err?.message || 'Unknown error';
      Log.error(`[ensureRazorpayLinkedAccount] Failed for user ${userId} (${entityType})`, {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
      });
      return { success: false, error: razorpayError };
    }
  }
}

import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { verifyBankAccount, isConfigured as isIdtoaiConfigured } from "@services/idtoaiService";
import { createRouteLinkedAccount, isRazorpayConfigured, checkRazorpayEmailStatus, getRouteAccountActivationStatus, routeBusinessTypeForPan, isIndividualPan } from "@services/razorpayService";
import { CreateBankInformationInput, UpdateBankInformationInput } from "./BankInformationType";
import { getResubmitWindow } from "@utils/General";
import { appConfig } from "@config/app";
import { notifySensitiveUpdate } from "@utils/sensitiveUpdateNotifier";
import { generateAndSendOtp, verifyOtpByType, OTP_TYPES } from "@module/auth/AuthService";
import { isNameMatch } from "@utils/nameMatch";
import { maskTail, maskIfsc, isMasked } from "@utils/redact";
import { decryptPii, taxPanContext } from "@utils/crypto";
import { getNameSources, matchAgainstReferences, anchorMissingMessage } from "@module/verify/NameCheckService";

/** Bank name and account holder name: letters, dots, and spaces only. */
const BANK_NAME_PATTERN = /^[A-Za-z. ]+$/;

/** Trim and collapse internal whitespace. */
const cleanName = (v?: string | null) =>
  (v ?? '').trim().replace(/\s+/g, ' ');

/**
 * Translate raw Razorpay Route error descriptions into user-friendly, actionable
 * messages. Falls back to the raw description (or a generic message) when unknown.
 */
const friendlyRazorpayError = (raw?: string | null): string => {
  const desc = (raw || '').trim();
  const lower = desc.toLowerCase();

  if (lower.includes('country pin') || lower.includes('postal') || lower.includes('pincode') || lower.includes('pin code')) {
    return 'The PIN/postal code in your profile address is invalid. Please update it to a valid 6-digit PIN code in your profile and try again.';
  }
  if (/\bpan\b/.test(lower)) {
    return 'The PAN on file appears to be invalid. Please check your PAN in your tax information and try again.';
  }
  if (lower.includes('phone') || lower.includes('contact number')) {
    return 'The phone number on your profile appears to be invalid. Please update it and try again.';
  }
  if (lower.includes('email')) {
    return 'The email used for your payment account appears to be invalid. Please use a valid email and try again.';
  }
  if (lower.includes('ifsc')) {
    return 'The IFSC code appears to be invalid. Please check your bank IFSC and try again.';
  }
  if (lower.includes('account number') || lower.includes('bank account')) {
    return 'The bank account number appears to be invalid. Please check your account details and try again.';
  }

  return desc || 'Payment account setup failed. Please try again or contact support.';
};

const entityLabel = (entityType: string) =>
  entityType === 'AGENCY' ? 'company / agency' : 'individual';

/**
 * Razorpay Route refuses a second linked account on an email that already has one,
 * so individual and agency bank details must each use a different email.
 * Returns a user-facing message when the email can't be used, otherwise null.
 */
const emailUnavailableReason = async (
  userId: number,
  email: string,
  entityType: string,
): Promise<string | null> => {
  const otherUser = await (prisma as any).bankInformation.findFirst({
    where: { razorpay_email: email, user_id: { not: userId } },
    select: { id: true },
  });
  if (otherUser) {
    return `This email is already linked to another account. Please use a different email for your ${entityLabel(entityType)} bank account.`;
  }

  const ownOtherEntity = await (prisma as any).bankInformation.findFirst({
    where: { user_id: userId, razorpay_email: email, entity_type: { not: entityType } },
    select: { entity_type: true },
  });
  if (ownOtherEntity) {
    return `This email is already used for your ${entityLabel(ownOtherEntity.entity_type)} bank account. The payment provider does not allow two payment accounts on the same email, so please use a different email for your ${entityLabel(entityType)} bank account.`;
  }

  if (!isRazorpayConfigured()) return null;

  const razorpayStatus = await checkRazorpayEmailStatus(email);
  if (razorpayStatus.status === 'suspended') {
    return `This email has a suspended payment account on ScaleDux. Please use a different email for your ${entityLabel(entityType)} bank account.`;
  }
  if (razorpayStatus.status === 'active') {
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { razorpay_account_id: true, razorpay_agency_account_id: true },
    });
    const ownAccountId = entityType === 'AGENCY' ? user?.razorpay_agency_account_id : user?.razorpay_account_id;
    if (ownAccountId !== razorpayStatus.accountId) {
      return `This email already has a payment account with our payment provider. Please use a different email for your ${entityLabel(entityType)} bank account.`;
    }
  }

  return null;
};

type TaxGate =
  | { ok: true; name: string | null; entityLabel: string; pan: string }
  | { ok: false; message: string };

const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/**
 * Bank details depend on tax information: the PAN is decrypted here and sent to
 * Razorpay Route, and the account holder name is matched against the PAN-verified name.
 */
const requireVerifiedTaxInformation = async (userId: number, entityType: string): Promise<TaxGate> => {
  const label = entityLabel(entityType);
  const taxInfo = await (prisma as any).taxInformation.findFirst({
    where: { user_id: userId, entity_type: entityType },
    select: { id: true, name: true, pan_number: true, gstin_status: true },
  });

  if (!taxInfo?.pan_number || taxInfo.gstin_status !== 'VERIFIED') {
    return {
      ok: false,
      message: `Please add and verify your ${label} tax information (PAN) before adding or updating bank details.`,
    };
  }

  // Rows written while only the mask was kept cannot be recovered
  const reenterMessage =
    `Please save your ${label} tax information again. Your PAN was stored before we could keep it recoverable, so it has to be entered once more before payments can be set up.`;
  if (isMasked(taxInfo.pan_number)) {
    return { ok: false, message: reenterMessage };
  }

  let pan: string;
  try {
    pan = decryptPii(taxInfo.pan_number, taxPanContext(userId, entityType)).toUpperCase();
  } catch (err: any) {
    Log.error(`[requireVerifiedTaxInformation] PAN decrypt failed for user ${userId} (${entityType})`, {
      taxInformationId: taxInfo.id,
      message: err?.message,
    });
    return { ok: false, message: reenterMessage };
  }
  if (!PAN_PATTERN.test(pan)) {
    return { ok: false, message: reenterMessage };
  }

  return { ok: true, name: taxInfo.name || null, entityLabel: label, pan };
};

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
      const reviewMs = 60 * 1000; // 1 minute. Route activation usually completes within a minute
      const refreshTasks: Promise<void>[] = [];
      for (const [rec, accId] of [
        [individual, userRecord?.razorpay_account_id],
        [agency, userRecord?.razorpay_agency_account_id],
      ] as [any, string | null][]) {
        if (!rec || !accId) continue;
        const status = rec.razorpay_activation_status;
        // Re-check pending payouts against the Route PRODUCT activation status (the account
        // `status` stays "created" even once the product is activated).
        if (status === 'in_review') {
          const verifiedAt = rec.verified_at ? new Date(rec.verified_at).getTime() : 0;
          if (Date.now() - verifiedAt >= reviewMs) {
            refreshTasks.push(
              getRouteAccountActivationStatus(accId, rec.razorpay_product_id).then(async (rpStatus) => {
                // activated -> activated; suspended/rejected -> failed; anything else
                // (needs_clarification, under_review, null/API error) stays pending, never false-fail.
                let newStatus = 'in_review';
                if (rpStatus === 'activated') newStatus = 'activated';
                else if (rpStatus === 'suspended' || rpStatus === 'rejected') newStatus = 'failed';
                if (newStatus !== status) {
                  const failureReason = newStatus === 'failed'
                    ? `Your payment account was ${rpStatus} by the payment provider, so payouts to this bank account cannot be set up. Please update your bank details and try again, or contact support.`
                    : null;
                  await (prisma as any).bankInformation.update({
                    where: { id: rec.id },
                    data: {
                      razorpay_activation_status: newStatus,
                      ...(failureReason ? { verification_failure_reason: failureReason } : {}),
                    },
                  });
                  rec.razorpay_activation_status = newStatus;
                  if (failureReason) rec.verification_failure_reason = failureReason;
                }
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
  static async sendEmailOtp(userId: number, email?: string, entityType?: string): Promise<{ success: boolean; message: string }> {
    if (!email?.trim()) {
      // Default to user's registered email
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      email = user?.email || undefined;
    }
    if (!email?.trim()) {
      return { success: false, message: 'Email is required.' };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const entity = entityType === 'AGENCY' ? 'AGENCY' : 'INDIVIDUAL';

    const unavailable = await emailUnavailableReason(userId, normalizedEmail, entity);
    if (unavailable) {
      return { success: false, message: unavailable };
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

    // ── Tax information gate ──
    const taxGate = await requireVerifiedTaxInformation(userIdNum, entityType);
    if (!taxGate.ok) return { success: false, message: taxGate.message };

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

    const emailUnavailable = await emailUnavailableReason(userIdNum, razorpayEmail, entityType);
    if (emailUnavailable) {
      return { success: false, message: emailUnavailable };
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

    let accountHolderName = cleanedHolderName || taxGate.name || null;
    if (!accountHolderName) {
      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { first_name: true, last_name: true }
      });
      accountHolderName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || data.displayLabel;
    }

    // Reject a mismatched name before spending a paid verification call
    const { anchor, refs: references } = await getNameSources(userIdNum, entityType, 'bank');
    if (!anchor) return { success: false, message: anchorMissingMessage(entityType) };
    const preCheck = matchAgainstReferences(accountHolderName, references);
    if (!preCheck.valid) return { success: false, message: preCheck.message! };

    // Verify via IDtoAI pennyless bank verification
    if (!isIdtoaiConfigured()) {
      return { success: false, message: 'Bank verification service is temporarily unavailable. Please try again later.' };
    }

    const verification = await verifyBankAccount(accountNumber, ifsc, String(userIdNum));
    if (!verification.success) {
      Log.error(`Bank verification failed for user ${userIdNum}`, { error: verification.error });
      return { success: false, message: verification.error || 'Bank account verification failed. Please check your details.' };
    }

    // Validate account holder name matches bank records
    if (!isNameMatch(accountHolderName, verification.accountHolderName)) {
      return {
        success: false,
        message: 'Account holder name does not match bank records. Please enter the name exactly as registered with your bank.'
      };
    }

    // Use verified account holder name from bank if available
    const verifiedName = verification.accountHolderName || accountHolderName;

    // The name the bank holds must also match PAN and identity records
    const verifiedCheck = matchAgainstReferences(
      verifiedName, references, 'The name registered on this bank account',
    );
    if (!verifiedCheck.valid) return { success: false, message: verifiedCheck.message! };
    const verifiedBankName = verification.bankName || cleanedBankName || null;

    // Create Razorpay Route linked account BEFORE saving bank info
    const razorpayResult = await BankInformationService.ensureRazorpayLinkedAccount(userIdNum, entityType, {
      name: verifiedName || data.displayLabel || 'User',
      ifsc,
      accountNumber,
    }, razorpayEmail, taxGate.pan);

    if (!razorpayResult.success) {
      void notifySensitiveUpdate(
        userIdNum,
        'Bank verification failed',
        `Verification of your ${entityType.toLowerCase()} bank account ending in ${accountNumberLast4} failed: ${razorpayResult.error} Please try again or contact support.`,
      );
      return {
        success: false,
        message: `Bank verification failed: ${razorpayResult.error}`
      };
    }

    const record = await (prisma as any).bankInformation.create({
      data: {
        user_id: userIdNum,
        type: 'bank_account',
        entity_type: entityType,
        display_label: data.displayLabel,
        bank_name: verifiedBankName,
        account_number: maskTail(accountNumber),
        account_number_last4: accountNumberLast4,
        account_holder_name: verifiedName,
        ifsc: maskIfsc(ifsc),
        razorpay_email: razorpayEmail,
        razorpay_product_id: razorpayResult.productId || null,
        razorpay_activation_status: razorpayResult.activationStatus === 'activated' ? 'activated' : 'in_review',
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

  static async resubmitForVerification(
    userId: string,
    entityType?: string,
    bank?: { accountNumber?: string; ifsc?: string },
  ): Promise<{ success: boolean; message: string; data?: any }> {
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

    const taxGate = await requireVerifiedTaxInformation(userIdNum, record.entity_type);
    if (!taxGate.ok) return { success: false, message: taxGate.message };

    if (!isIdtoaiConfigured()) {
      return { success: false, message: 'Bank verification service is temporarily unavailable. Please try again later.' };
    }

    // Stored masked, so the account has to be re-entered to be re-verified
    const accountNumber = (bank?.accountNumber || '').replace(/\D/g, '').trim();
    const ifsc = (bank?.ifsc || '').trim().toUpperCase();
    if (!accountNumber || accountNumber.length < 9 || !ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      return { success: false, message: 'Please enter your account number and IFSC again to resubmit. We only keep them masked.' };
    }
    if (record.account_number_last4 && accountNumber.slice(-4) !== record.account_number_last4) {
      return { success: false, message: 'This account number does not match the one on file. Edit your bank details instead to change the account.' };
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

    const resubmitName = verification.accountHolderName || record.account_holder_name;
    const { anchor: resubmitAnchor, refs: resubmitRefs } = await getNameSources(userIdNum, record.entity_type, 'bank');
    if (!resubmitAnchor) return { success: false, message: anchorMissingMessage(record.entity_type) };
    const resubmitCheck = matchAgainstReferences(
      resubmitName, resubmitRefs, 'The name registered on this bank account',
    );
    if (!resubmitCheck.valid) return { success: false, message: resubmitCheck.message! };

    // Re-create Razorpay Route linked account before saving
    const razorpayResult = await BankInformationService.ensureRazorpayLinkedAccount(userIdNum, record.entity_type, {
      name: verification.accountHolderName || record.account_holder_name || 'User',
      ifsc,
      accountNumber,
    }, record.razorpay_email, taxGate.pan);

    if (!razorpayResult.success) {
      void notifySensitiveUpdate(
        userIdNum,
        'Bank verification failed',
        `Verification of your bank account failed: ${razorpayResult.error} Please try again or contact support.`,
      );
      return { success: false, message: `Bank verification failed: ${razorpayResult.error}` };
    }

    await (prisma as any).bankInformation.update({
      where: { id: record.id },
      data: {
        account_holder_name: verification.accountHolderName || record.account_holder_name,
        bank_name: verification.bankName || record.bank_name,
        razorpay_product_id: razorpayResult.productId || null,
        razorpay_activation_status: razorpayResult.activationStatus === 'activated' ? 'activated' : 'in_review',
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

    // ── Tax information gate ──
    const taxGate = await requireVerifiedTaxInformation(userIdNum, record.entity_type);
    if (!taxGate.ok) return { success: false, message: taxGate.message };

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
      const emailUnavailable = await emailUnavailableReason(userIdNum, newEmail, record.entity_type);
      if (emailUnavailable) {
        return { success: false, message: emailUnavailable };
      }
    }

    // Account number and IFSC are stored masked, so re-verification cannot fall back
    // to the record: supplying either means both have to be entered again in full.
    const submittedIfsc = data.ifsc != null ? String(data.ifsc).trim().toUpperCase() : '';
    const submittedAccountNumber = data.accountNumber != null ? data.accountNumber.replace(/\D/g, '').trim() : '';
    const displayLabel = data.displayLabel?.trim() ?? record.display_label;

    const incomingHolderName = data.accountHolderName != null ? cleanName(data.accountHolderName) : null;
    if (incomingHolderName && !BANK_NAME_PATTERN.test(incomingHolderName)) {
      return { success: false, message: 'Account holder name can only contain letters and spaces' };
    }
    const accountHolderName = incomingHolderName ?? record.account_holder_name;
    const { anchor, refs: references } = await getNameSources(userIdNum, record.entity_type, 'bank');
    if (!anchor) return { success: false, message: anchorMissingMessage(record.entity_type) };
    const holderCheck = matchAgainstReferences(accountHolderName, references);
    if (!holderCheck.valid) return { success: false, message: holderCheck.message! };

    const incomingBankName = data.bankName != null ? cleanName(data.bankName) : null;
    if (incomingBankName && !BANK_NAME_PATTERN.test(incomingBankName)) {
      return { success: false, message: 'Bank name can only contain letters and spaces' };
    }
    const bankName = incomingBankName ?? record.bank_name;

    const needsReverification = !!submittedAccountNumber || !!submittedIfsc;

    if (needsReverification) {
      if (!submittedAccountNumber || !submittedIfsc) {
        return {
          success: false,
          message: 'Both account number and IFSC are needed to re-verify. We only keep them masked, so please enter both again.',
        };
      }
      const accountNumber = submittedAccountNumber;
      const ifsc = submittedIfsc;
      if (accountNumber.length < 9) {
        return { success: false, message: 'Valid account number (at least 9 digits) is required.' };
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
        return { success: false, message: 'Valid IFSC is required (e.g. HDFC0001234)' };
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

      if (!isNameMatch(accountHolderName, verification.accountHolderName)) {
        return {
          success: false,
          message: 'Account holder name does not match bank records. Please enter the name exactly as registered with your bank.'
        };
      }

      const verifiedName = verification.accountHolderName || accountHolderName;
      const verifiedCheck = matchAgainstReferences(
        verifiedName, references, 'The name registered on this bank account',
      );
      if (!verifiedCheck.valid) return { success: false, message: verifiedCheck.message! };

      const verifiedBankName = verification.bankName || bankName;
      const accountNumberLast4 = accountNumber.slice(-4);

      // Create Razorpay Route linked account before saving bank details
      const razorpayResult = await BankInformationService.ensureRazorpayLinkedAccount(userIdNum, record.entity_type, {
        name: verifiedName || 'User',
        ifsc,
        accountNumber,
      }, emailChanging ? newEmail : record.razorpay_email, taxGate.pan);

      if (!razorpayResult.success) {
        void notifySensitiveUpdate(
          userIdNum,
          'Bank update failed',
          `Verification of your updated bank account failed: ${razorpayResult.error} Please try again or contact support.`,
        );
        return { success: false, message: `Bank verification failed: ${razorpayResult.error}` };
      }

      const updatedEmail = emailChanging ? newEmail : record.razorpay_email;
      const newActivationStatus = razorpayResult.activationStatus === 'activated' ? 'activated' : 'in_review';
      await prisma.$executeRaw`
        UPDATE scd_bank_information
        SET display_label = ${displayLabel}, bank_name = ${verifiedBankName}, account_number = ${maskTail(accountNumber)},
            account_number_last4 = ${accountNumberLast4}, ifsc = ${maskIfsc(ifsc)},
            account_holder_name = ${verifiedName}, razorpay_email = ${updatedEmail},
            razorpay_product_id = ${razorpayResult.productId || null},
            razorpay_activation_status = ${newActivationStatus},
            verification_status = 'verified', verification_failure_reason = NULL,
            verified_at = NOW(), updated_at = NOW()
        WHERE id = ${recordIdNum} AND user_id = ${userIdNum}
      `;
    } else {
      // Only label/name/bank name/email changed, no re-verification needed
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

  /** Flatten TaxInformation.tax_residence into a Razorpay address, resolving the stored state id to its name. */
  private static async resolveTaxAddress(taxResidence: any): Promise<{
    street1?: string; street2?: string; city?: string; state?: string; postalCode?: string;
  }> {
    if (!taxResidence || typeof taxResidence !== 'object') return {};

    const trimmed = (v: any) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    let state = trimmed(taxResidence.state);
    if (state && /^\d+$/.test(state)) {
      const row = await prisma.state.findUnique({
        where: { id: parseInt(state, 10) },
        select: { name: true },
      }).catch(() => null);
      state = row?.name || undefined;
    }

    return {
      street1: trimmed(taxResidence.addressLine1),
      street2: trimmed(taxResidence.addressLine2),
      city: trimmed(taxResidence.city),
      state,
      postalCode: trimmed(taxResidence.zipCode),
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
    razorpayEmail: string | null | undefined,
    /** Re-entered by the user; only the masked form is stored. */
    pan: string,
  ): Promise<{ success: boolean; error?: string; activationStatus?: string; productId?: string }> {
    if (!isRazorpayConfigured()) {
      Log.warn(`[ensureRazorpayLinkedAccount] Razorpay not configured, skipping for user ${userId}`);
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
        Log.warn(`[ensureRazorpayLinkedAccount] User ${userId} not found, skipping`);
        return { success: false, error: 'User not found.' };
      }
      // Use razorpay_email (from bank record) if provided, otherwise fall back to user's ScaleDux email
      const emailForRazorpay = razorpayEmail || user.email;
      if (!emailForRazorpay) {
        Log.warn(`[ensureRazorpayLinkedAccount] No email for user ${userId}, skipping`);
        return { success: false, error: 'Email not found. Please provide an email for Razorpay.' };
      }
      const existingId = isAgency ? user.razorpay_agency_account_id : user.razorpay_account_id;

      // Legal name and tax residence address come from the PAN-verified tax record;
      // the PAN itself is passed in, since only its masked form is stored.
      const taxInfo = await (prisma as any).taxInformation.findFirst({
        where: { user_id: userId, entity_type: entityType },
        select: { name: true, tax_residence: true }
      });

      const taxAddress = await BankInformationService.resolveTaxAddress(taxInfo?.tax_residence);
      const info = user.personalInfo;
      const legalName = taxInfo?.name
        || bank.name
        || [user.first_name, user.last_name].filter(Boolean).join(' ')
        || 'User';

      // Tax residence is authoritative; profile address only fills gaps left by optional tax fields
      const address = {
        street1: taxAddress.street1 || info?.address || undefined,
        street2: taxAddress.street2 || info?.address_line_2 || undefined,
        city: taxAddress.city || info?.city || undefined,
        state: taxAddress.state || info?.state?.name || undefined,
        postalCode: taxAddress.postalCode || info?.zipCode || undefined,
      };

      // A company PAN on the stakeholder is rejected: the stakeholder is a person
      const businessType = isAgency ? routeBusinessTypeForPan(pan) : 'individual';
      const stakeholderPan = isIndividualPan(pan) ? pan : undefined;

      Log.info(`[ensureRazorpayLinkedAccount] ${existingId ? 'Updating' : 'Creating'} Route linked account for user ${userId} (${entityType})`, {
        addressSource: taxAddress.postalCode ? 'tax_information' : 'personal_info',
        businessType,
        stakeholderPan: stakeholderPan ? 'individual' : 'omitted (non-individual PAN)',
      });

      const result = await createRouteLinkedAccount({
        email: emailForRazorpay,
        phone: user?.phone || undefined,
        legalBusinessName: legalName,
        businessType,
        pan,
        existingAccountId: existingId || undefined,
        address,
        stakeholder: { name: legalName, email: emailForRazorpay, phone: user?.phone || undefined, pan: stakeholderPan },
        bankAccount: { name: bank.name || legalName, ifsc: bank.ifsc, accountNumber: bank.accountNumber },
      });

      if (!existingId) {
        await (prisma as any).user.update({
          where: { id: userId },
          data: { [field]: result.accountId }
        });
      }

      Log.info(`[ensureRazorpayLinkedAccount] ${existingId ? 'Updated' : 'Created'} ${result.accountId} for user ${userId} (${entityType})`, {
        activationStatus: result.activationStatus,
        productId: result.productId,
      });
      return { success: true, activationStatus: result.activationStatus, productId: result.productId };
    } catch (err: any) {
      const rawError = err?.response?.data?.error?.description || err?.message || 'Unknown error';
      Log.error(`[ensureRazorpayLinkedAccount] Failed for user ${userId} (${entityType})`, {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
        rawError,
      });
      return { success: false, error: friendlyRazorpayError(rawError) };
    }
  }
}

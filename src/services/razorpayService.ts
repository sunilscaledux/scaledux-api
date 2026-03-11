import axios from "axios";
import razorpayConfig from "@config/razorpay";

function getAuthHeader(): string {
  const { key_id, key_secret } = razorpayConfig;
  if (!key_id || !key_secret) {
    throw new Error("Razorpay is not configured (key_id or key_secret missing)");
  }
  return `Basic ${Buffer.from(`${key_id}:${key_secret}`).toString("base64")}`;
}

function getXBaseUrl(): string {
  const url = razorpayConfig.xBaseUrl;
  if (!url) {
    throw new Error("Razorpay X base URL not configured");
  }
  return url.replace(/\/$/, "");
}

/**
 * Razorpay X: verify bank account (penny drop).
 * Uses POST /v1/fund_accounts/validations. Returns status and beneficiary name from bank.
 * Note: Official Razorpay X API may require fund_account.id (validate after creating fund account).
 * If this endpoint fails, consider createContactAndFundAccountThenValidate or Razorpay Composite Account Validation.
 */
export async function verifyBankAccount(params: {
  accountNumber: string;
  ifsc: string;
}): Promise<{ status: string; beneficiaryName?: string }> {
  const baseUrl = getXBaseUrl();
  const auth = getAuthHeader();
  const res = await axios.post(
    `${baseUrl}/fund_accounts/validations`,
    {
      account_number: params.accountNumber,
      ifsc: params.ifsc,
    },
    {
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
    }
  );
  const data = res.data ?? {};
  const status = data.status ?? data.results?.account_status ?? "";
  const beneficiaryName =
    data.beneficiary_name ?? data.results?.registered_name ?? data.fund_account?.bank_account?.name;
  return {
    status: String(status).toLowerCase(),
    beneficiaryName: beneficiaryName ? String(beneficiaryName).trim() : undefined,
  };
}

/**
 * Razorpay X: validate an existing fund account (penny drop ₹1).
 * Use when validation API requires fund_account.id (create contact → fund account first, then call this).
 * Needs platform's RazorpayX account number (RAZORPAY_X_ACCOUNT_NUMBER env).
 */
export async function validateFundAccount(params: {
  fundAccountId: string;
  amountPaise?: number;
}): Promise<{ status: string; beneficiaryName?: string }> {
  const baseUrl = getXBaseUrl();
  const auth = getAuthHeader();
  const platformAccount = process.env.RAZORPAY_X_ACCOUNT_NUMBER;
  if (!platformAccount) {
    throw new Error("RAZORPAY_X_ACCOUNT_NUMBER is required for fund account validation");
  }
  const res = await axios.post(
    `${baseUrl}/fund_accounts/validations`,
    {
      account_number: platformAccount,
      fund_account: { id: params.fundAccountId },
      amount: params.amountPaise ?? 100,
      currency: "INR",
    },
    { headers: { Authorization: auth, "Content-Type": "application/json" } }
  );
  const data = res.data ?? {};
  const status = data.status ?? "";
  const beneficiaryName =
    data.results?.registered_name ?? data.fund_account?.bank_account?.name;
  return {
    status: String(status).toLowerCase(),
    beneficiaryName: beneficiaryName ? String(beneficiaryName).trim() : undefined,
  };
}

/**
 * Razorpay X: create a contact (required before creating a fund account).
 */
export async function createContact(params: {
  name: string;
  email: string;
  contact: string;
  type?: string;
}): Promise<{ id: string }> {
  const baseUrl = getXBaseUrl();
  const auth = getAuthHeader();
  const res = await axios.post(
    `${baseUrl}/contacts`,
    {
      name: params.name.slice(0, 50),
      email: params.email,
      contact: params.contact,
      type: params.type ?? "employee",
    },
    { headers: { Authorization: auth, "Content-Type": "application/json" } }
  );
  const id = res.data?.id;
  if (!id) throw new Error("No contact id in Razorpay response");
  return { id };
}

/**
 * Razorpay X: create a bank fund account linked to a contact.
 */
export async function createFundAccount(params: {
  contactId: string;
  accountType: "bank_account";
  bankAccount: { name: string; ifsc: string; account_number: string };
}): Promise<{ id: string }> {
  const baseUrl = getXBaseUrl();
  const auth = getAuthHeader();
  const res = await axios.post(
    `${baseUrl}/fund_accounts`,
    {
      contact_id: params.contactId,
      account_type: params.accountType,
      bank_account: {
        name: params.bankAccount.name.slice(0, 100),
        ifsc: params.bankAccount.ifsc,
        account_number: params.bankAccount.account_number,
      },
    },
    { headers: { Authorization: auth, "Content-Type": "application/json" } }
  );
  const id = res.data?.id;
  if (!id) throw new Error("No fund_account id in Razorpay response");
  return { id };
}

/**
 * Verify bank (penny drop) → create or reuse contact → create fund account.
 * Use existingContactId to reuse contact and avoid duplicates.
 */
export async function createContactAndFundAccount(params: {
  name: string;
  email: string;
  contact: string;
  ifsc: string;
  accountNumber: string;
  /** Reuse existing Razorpay contact (e.g. User.razorpay_contact_id) to avoid duplicate contacts. */
  existingContactId?: string;
  /** If true, compare beneficiary name from penny drop with params.name and throw on mismatch. */
  validateBeneficiaryName?: boolean;
}): Promise<{ contactId: string; fundAccountId: string }> {
  // 1. Verify bank account (₹1 penny drop)
  const verification = await verifyBankAccount({
    accountNumber: params.accountNumber,
    ifsc: params.ifsc,
  });

  if (verification.status !== "completed") {
    throw new Error(
      `Bank account verification failed (status: ${verification.status}). Please check account number and IFSC.`
    );
  }

  // Optional: compare beneficiary name with provided name (normalize spaces and case)
  if (params.validateBeneficiaryName && verification.beneficiaryName && params.name) {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
    const a = normalize(verification.beneficiaryName);
    const b = normalize(params.name);
    if (a !== b) {
      throw new Error(
        `Bank account name mismatch. Bank returned: "${verification.beneficiaryName}". Please use the exact account holder name.`
      );
    }
  }

  // 2. Create contact or reuse existing
  let contactId: string;
  if (params.existingContactId?.trim()) {
    contactId = params.existingContactId.trim();
  } else {
    const contact = await createContact({
      name: params.name,
      email: params.email,
      contact: params.contact,
    });
    contactId = contact.id;
  }

  // 3. Create fund account
  const fundAccount = await createFundAccount({
    contactId,
    accountType: "bank_account",
    bankAccount: {
      name: params.name,
      ifsc: params.ifsc,
      account_number: params.accountNumber,
    },
  });

  return { contactId, fundAccountId: fundAccount.id };
}

export function isRazorpayConfigured(): boolean {
  return !!(razorpayConfig.key_id && razorpayConfig.key_secret);
}

export function getRazorpayXBaseUrl(): string {
  return razorpayConfig.xBaseUrl || "https://api.razorpay.com/v1";
}

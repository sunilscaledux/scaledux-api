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
 * Create or reuse contact → create fund account → penny-drop validation.
 * Fund account must exist before Razorpay can validate it.
 */
export async function createContactAndFundAccount(params: {
  name: string;
  email: string;
  contact: string;
  ifsc: string;
  accountNumber: string;
  /** Reuse existing Razorpay contact to avoid duplicate contacts. */
  existingContactId?: string;
  /** If true, run penny-drop validation after creating fund account. */
  validateBeneficiaryName?: boolean;
}): Promise<{ contactId: string; fundAccountId: string }> {
  // 1. Create contact or reuse existing
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

  // 2. Create fund account
  const fundAccount = await createFundAccount({
    contactId,
    accountType: "bank_account",
    bankAccount: {
      name: params.name,
      ifsc: params.ifsc,
      account_number: params.accountNumber,
    },
  });

  // 3. Penny-drop validation (requires fund_account.id + platform account number)
  if (params.validateBeneficiaryName) {
    const platformAccount = process.env.RAZORPAY_X_ACCOUNT_NUMBER;
    if (platformAccount) {
      try {
        const validation = await validateFundAccount({
          fundAccountId: fundAccount.id,
        });
        if (validation.status === "failed") {
          throw new Error(
            "Bank account validation failed. Please check your account number and IFSC."
          );
        }
      } catch (err: any) {
        // If validation endpoint is not available, log and continue — fund account is still created
        const msg = err?.response?.data?.error?.description || err?.message || "";
        if (msg.includes("Access to requested resource") || msg.includes("not available")) {
          // Validation API not enabled on this Razorpay account — skip
        } else {
          throw err;
        }
      }
    }
  }

  return { contactId, fundAccountId: fundAccount.id };
}

/**
 * Razorpay Route: create a linked account (sub-merchant) for receiving transfers.
 * Returns acc_xxx (18-char ID) required for Route order transfers.
 */
export async function createRouteLinkedAccount(params: {
  email: string;
  phone?: string;
  legalBusinessName: string;
  businessType?: string;
}): Promise<{ accountId: string }> {
  const { key_id, key_secret } = razorpayConfig;
  if (!key_id || !key_secret) {
    throw new Error("Razorpay is not configured");
  }
  const auth = `Basic ${Buffer.from(`${key_id}:${key_secret}`).toString("base64")}`;
  try {
    const res = await axios.post(
      "https://api.razorpay.com/v2/accounts",
      {
        email: params.email,
        phone: params.phone || "9999999999",
        type: "route",
        legal_business_name: params.legalBusinessName.slice(0, 200),
        business_type: params.businessType || "not_yet_registered",
        legal_info: { pan: "AANFA0000Z" },
        profile: {
          category: "healthcare",
          subcategory: "clinic",
          addresses: {
            registered: {
              street1: "NA",
              street2: "NA",
              city: "Mumbai",
              state: "Maharashtra",
              postal_code: 400001,
              country: "IN",
            },
          },
        },
      },
      { headers: { Authorization: auth, "Content-Type": "application/json" } }
    );
    const accountId = res.data?.id;
    if (!accountId) throw new Error("No account id in Razorpay Route response");
    return { accountId };
  } catch (err: any) {
    // If email already exists, fetch the existing account ID from error
    const desc = err?.response?.data?.error?.description || "";
    const match = desc.match(/already exists for account\s*-\s*(\S+)/i);
    if (match?.[1]) {
      try {
        const fetchRes = await axios.get(
          `https://api.razorpay.com/v2/accounts/${match[1]}`,
          { headers: { Authorization: auth, "Content-Type": "application/json" } }
        );
        if (fetchRes.data?.id) return { accountId: fetchRes.data.id };
      } catch { /* fall through */ }
    }
    throw err;
  }
}

export function isRazorpayConfigured(): boolean {
  return !!(razorpayConfig.key_id && razorpayConfig.key_secret);
}


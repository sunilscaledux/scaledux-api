import axios from "axios";
import razorpayConfig from "@config/razorpay";
import { Log } from "@services/loggerService";

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
 * Check if an email already has a Razorpay Route linked account and its status.
 * Returns 'none' if no account exists, 'suspended' if all accounts are suspended,
 * or 'active' with the account ID if a usable account exists.
 */
/**
 * Check if an email already has a Razorpay linked account and whether it's suspended.
 * Searches Razorpay directly by email — no DB lookups.
 */
export async function checkRazorpayEmailStatus(email: string): Promise<
  { status: 'none' } | { status: 'suspended' } | { status: 'active'; accountId: string }
> {
  const { key_id, key_secret } = razorpayConfig;
  if (!key_id || !key_secret) return { status: 'none' };

  const auth = `Basic ${Buffer.from(`${key_id}:${key_secret}`).toString("base64")}`;
  const headers = { Authorization: auth, "Content-Type": "application/json" };

  const searchUrls = [
    `https://api.razorpay.com/v2/accounts?email=${encodeURIComponent(email)}`,
    `https://api.razorpay.com/v1/beta/accounts?email=${encodeURIComponent(email)}`,
  ];

  for (const url of searchUrls) {
    try {
      const res = await axios.get(url, { headers });
      const items = res.data?.items || res.data;
      if (!Array.isArray(items) || items.length === 0) continue;

      Log.info(`[checkRazorpayEmailStatus] Found ${items.length} account(s) for ${email}`, {
        accounts: JSON.stringify(items.map((a: any) => ({
          id: a.id,
          status: a.activation_details?.status || a.status,
        }))),
      });

      const active = items.find(
        (a: any) => a.id?.startsWith('acc_') && a.activation_details?.status !== 'suspended'
      );
      if (active?.id) return { status: 'active', accountId: active.id };

      // All accounts for this email are suspended
      return { status: 'suspended' };
    } catch (err: any) {
      Log.warn(`[checkRazorpayEmailStatus] Search failed at ${url}`, {
        status: err?.response?.status,
        message: err?.message,
      });
      continue;
    }
  }

  // No search endpoint returned results — email not found on Razorpay
  return { status: 'none' };
}

/**
 * Razorpay Route: create a linked account (sub-merchant) with stakeholder + bank account.
 * Steps: 1) Create account → 2) Add stakeholder (KYC) → 3) Add bank account → 4) Request activation.
 * Returns acc_xxx ID required for Route order transfers.
 */
export async function createRouteLinkedAccount(params: {
  email: string;
  phone?: string;
  legalBusinessName: string;
  businessType?: string;
  pan?: string;
  address?: { street1?: string; street2?: string; city?: string; state?: string; postalCode?: string };
  stakeholder?: { name: string; email: string; phone?: string; pan?: string };
  bankAccount?: { name: string; ifsc: string; accountNumber: string };
  /** If provided, skip account creation (Step 1) and use this existing account ID. */
  existingAccountId?: string;
}): Promise<{ accountId: string; productId?: string; activationStatus?: string }> {
  const { key_id, key_secret } = razorpayConfig;
  if (!key_id || !key_secret) {
    throw new Error("Razorpay is not configured");
  }
  const auth = `Basic ${Buffer.from(`${key_id}:${key_secret}`).toString("base64")}`;
  const headers = { Authorization: auth, "Content-Type": "application/json" };

  const businessType = params.businessType || "individual";
  const isIndividual = businessType === "individual";

  // Normalize phone to 10 digits (strip +91 / 0 prefix)
  const rawPhone = (params.phone || "").replace(/\D/g, "");
  const phone = rawPhone.length >= 10 ? rawPhone.slice(-10) : "9999999999";

  // postal_code must be a valid 6-digit Indian PIN (1-9 followed by 5 digits).
  // Razorpay rejects anything else with "Invalid country pin passed", so sanitize
  // the profile zip code and fall back to a known-valid default when it doesn't qualify.
  const rawPostal = (params.address?.postalCode || "").replace(/\D/g, "");
  const postalCode = /^[1-9]\d{5}$/.test(rawPostal) ? parseInt(rawPostal, 10) : 400001;

  let accountId: string;

  // Step 1: Create linked account (skip if existing account ID provided)
  if (params.existingAccountId) {
    accountId = params.existingAccountId;
  } else {
    try {
      const body: any = {
        email: params.email,
        phone,
        type: "route",
        legal_business_name: params.legalBusinessName.slice(0, 200),
        business_type: businessType,
        ...(!isIndividual && params.pan ? { legal_info: { pan: params.pan } } : {}),
        profile: {
          category: "education",
          subcategory: "coaching",
          addresses: {
            registered: {
              street1: params.address?.street1 || "Not provided",
              street2: params.address?.street2 || "NA",
              city: params.address?.city || "Mumbai",
              state: params.address?.state || "Maharashtra",
              postal_code: postalCode,
              country: "IN",
            },
          },
        },
      };

      const res = await axios.post("https://api.razorpay.com/v2/accounts", body, { headers });
      accountId = res.data?.id;
      if (!accountId) throw new Error("No account id in Razorpay Route response");
    } catch (err: any) {
      // If email already exists, find the existing linked account
      const desc = err?.response?.data?.error?.description || "";
      if (/already exists/i.test(desc)) {
        try {
          const searchRes = await axios.get(
            `https://api.razorpay.com/v1/beta/accounts?email=${encodeURIComponent(params.email)}`,
            { headers }
          );
          // Find a non-suspended account
          const active = searchRes.data?.items?.find(
            (a: any) => a.id?.startsWith('acc_') && a.activation_details?.status !== 'suspended'
          );
          if (active?.id) {
            accountId = active.id;
          } else {
            throw new Error('This email has a suspended payment account on ScaleDux. Please use a different email to add your bank account.');
          }
        } catch { throw err; }
      } else {
        throw err;
      }
    }
  }

  // Step 2: Add or update stakeholder (KYC holder) — required for activation
  if (params.stakeholder) {
    const stakeholderBody = {
      name: params.stakeholder.name.slice(0, 200),
      email: params.stakeholder.email,
      phone: { primary: phone },
      ...(params.stakeholder.pan ? { kyc: { pan: params.stakeholder.pan } } : {}),
    };
    try {
      const stakRes = await axios.post(`https://api.razorpay.com/v2/accounts/${accountId}/stakeholders`, stakeholderBody, { headers });
      Log.info(`[createRouteLinkedAccount] Stakeholder created for ${accountId}`, { stakeholderId: stakRes.data?.id });
    } catch (err: any) {
      const desc = err?.response?.data?.error?.description || "";
      if (/(already|duplicate)/i.test(desc)) {
        Log.info(`[createRouteLinkedAccount] Stakeholder already exists for ${accountId}, fetching to update`);
        // Stakeholder exists — fetch and update with latest KYC/details
        try {
          const listRes = await axios.get(`https://api.razorpay.com/v2/accounts/${accountId}/stakeholders`, { headers });
          Log.info(`[createRouteLinkedAccount] Stakeholders fetch response`, { data: JSON.stringify(listRes.data) });
          // Handle both { items: [...] } and direct array response formats
          const items = listRes.data?.items || listRes.data;
          const existing = Array.isArray(items) ? items[0] : null;
          if (existing?.id) {
            await axios.patch(`https://api.razorpay.com/v2/accounts/${accountId}/stakeholders/${existing.id}`, stakeholderBody, { headers });
            Log.info(`[createRouteLinkedAccount] Stakeholder ${existing.id} updated with KYC for ${accountId}`);
          } else {
            Log.warn(`[createRouteLinkedAccount] Could not find stakeholder ID from response for ${accountId}`);
          }
        } catch (updateErr: any) {
          Log.error(`[createRouteLinkedAccount] Failed to update stakeholder for ${accountId}`, {
            status: updateErr?.response?.status,
            data: updateErr?.response?.data,
            message: updateErr?.message,
          });
        }
      } else {
        throw err;
      }
    }
  }

  // Step 3: Request product activation + add/update bank account via product config
  if (params.bankAccount) {
    let productId: string | undefined;

    // Try to request Route product
    try {
      const productRes = await axios.post(`https://api.razorpay.com/v2/accounts/${accountId}/products`, {
        product_name: "route",
      }, { headers });
      productId = productRes.data?.id;
      Log.info(`[createRouteLinkedAccount] Product requested for ${accountId}`, { productId });
    } catch (err: any) {
      const errData = err?.response?.data;
      const desc = errData?.error?.description || err?.message || "";
      if (/(already|duplicate|exists)/i.test(desc)) {
        Log.info(`[createRouteLinkedAccount] Product already requested for ${accountId}, finding product ID`);

        // Approach 1: Check error response for product ID
        productId = errData?.id || errData?.error?.metadata?.product_id;

        // Approach 2: Fetch account details to find product ID
        if (!productId) {
          try {
            const accRes = await axios.get(`https://api.razorpay.com/v2/accounts/${accountId}`, { headers });
            Log.info(`[createRouteLinkedAccount] Account fetch response for product lookup`, {
              activatedProducts: JSON.stringify(accRes.data?.activated_products),
              products: JSON.stringify(accRes.data?.products),
            });
            // Try various response formats Razorpay might use
            const products = accRes.data?.products;
            if (products?.route?.id) {
              productId = products.route.id;
            } else if (Array.isArray(products)) {
              productId = products.find((p: any) => p.product_name === "route")?.id;
            }
          } catch (accErr: any) {
            Log.error(`[createRouteLinkedAccount] Failed to fetch account ${accountId}`, {
              status: accErr?.response?.status,
              data: accErr?.response?.data,
            });
          }
        }

        // Approach 3: Try list products endpoint
        if (!productId) {
          try {
            const prodListRes = await axios.get(`https://api.razorpay.com/v2/accounts/${accountId}/products`, { headers });
            Log.info(`[createRouteLinkedAccount] Products list response`, { data: JSON.stringify(prodListRes.data) });
            const items = prodListRes.data?.items || prodListRes.data;
            const routeProduct = Array.isArray(items)
              ? items.find((p: any) => p.product_name === "route")
              : null;
            productId = routeProduct?.id;
          } catch (listErr: any) {
            Log.error(`[createRouteLinkedAccount] Failed to list products for ${accountId}`, {
              status: listErr?.response?.status,
              data: listErr?.response?.data,
            });
          }
        }

        Log.info(`[createRouteLinkedAccount] Resolved productId for ${accountId}: ${productId || 'NONE'}`);
      } else {
        throw err;
      }
    }

    // Update product config with bank details for settlements
    if (productId) {
      const patchRes = await axios.patch(`https://api.razorpay.com/v2/accounts/${accountId}/products/${productId}`, {
        settlements: {
          account_number: params.bankAccount.accountNumber,
          ifsc_code: params.bankAccount.ifsc,
          beneficiary_name: params.bankAccount.name.slice(0, 120),
        },
        tnc_accepted: true,
      }, { headers });
      Log.info(`[createRouteLinkedAccount] Product ${productId} updated with bank details for ${accountId}`, {
        activeConfig: JSON.stringify(patchRes.data?.active_configuration),
        requirements: JSON.stringify(patchRes.data?.requirements),
        activationStatus: patchRes.data?.activation_status,
      });

      // Check activation_status and resolve outstanding requirements
      let activationStatus = patchRes.data?.activation_status;

      if (activationStatus === 'needs_clarification') {
        // Attempt to resolve requirements by re-fetching and patching up to 3 times
        for (let attempt = 0; attempt < 3; attempt++) {
          const productGet = await axios.get(
            `https://api.razorpay.com/v2/accounts/${accountId}/products/${productId}`,
            { headers }
          );
          activationStatus = productGet.data?.activation_status;
          const requirements = productGet.data?.requirements || [];
          const pending = requirements;

          Log.info(`[createRouteLinkedAccount] Activation check attempt ${attempt + 1} for ${accountId}`, {
            activationStatus,
            pendingRequirements: JSON.stringify(pending),
          });

          if (activationStatus === 'activated' || pending.length === 0) break;

          // Build a patch body from the pending requirements
          const patchBody: any = {};
          for (const req of pending) {
            const field = req.field_reference;
            if (!field) continue;
            // Map known requirement fields to their values
            if (field === 'settlements.beneficiary_name') {
              patchBody.settlements = { ...patchBody.settlements, beneficiary_name: params.bankAccount.name.slice(0, 120) };
            } else if (field === 'settlements.account_number') {
              patchBody.settlements = { ...patchBody.settlements, account_number: params.bankAccount.accountNumber };
            } else if (field === 'settlements.ifsc_code') {
              patchBody.settlements = { ...patchBody.settlements, ifsc_code: params.bankAccount.ifsc };
            } else if (field === 'name') {
              patchBody.name = params.bankAccount.name.slice(0, 120);
            } else if (field === 'tnc_accepted') {
              patchBody.tnc_accepted = true;
            } else {
              Log.warn(`[createRouteLinkedAccount] Unhandled requirement field: ${field} for ${accountId}`);
            }
          }

          if (Object.keys(patchBody).length === 0) {
            Log.warn(`[createRouteLinkedAccount] No resolvable requirements left for ${accountId}`, { pending: JSON.stringify(pending) });
            break;
          }

          try {
            const rePatchRes = await axios.patch(
              `https://api.razorpay.com/v2/accounts/${accountId}/products/${productId}`,
              patchBody,
              { headers }
            );
            activationStatus = rePatchRes.data?.activation_status;
            Log.info(`[createRouteLinkedAccount] Re-patched requirements for ${accountId}`, {
              activationStatus,
              requirements: JSON.stringify(rePatchRes.data?.requirements),
            });
            if (activationStatus === 'activated') break;
          } catch (rePatchErr: any) {
            Log.error(`[createRouteLinkedAccount] Failed to re-patch requirements for ${accountId}`, {
              status: rePatchErr?.response?.status,
              data: rePatchErr?.response?.data,
            });
            break;
          }
        }
      }

      return { accountId, productId, activationStatus };
    } else {
      Log.error(`[createRouteLinkedAccount] Could not determine product ID for ${accountId} — bank settlement config NOT updated`);
    }
  }

  return { accountId };
}

/**
 * Fetch the current Route activation status.
 *
 * For Route, activation lives on the PRODUCT (activation_status: activated/needs_clarification/
 * under_review/...), NOT the account (whose `status` stays "created"). So when a productId is
 * known we read the product; we only fall back to the account status when it is missing.
 * Returns null on auth/network error so callers can treat it as "still pending", never "failed".
 */
export async function getRouteAccountActivationStatus(accountId: string, productId?: string | null): Promise<string | null> {
  const { key_id, key_secret } = razorpayConfig;
  if (!key_id || !key_secret) return null;
  const auth = `Basic ${Buffer.from(`${key_id}:${key_secret}`).toString("base64")}`;
  const headers = { Authorization: auth, "Content-Type": "application/json" };
  try {
    if (productId) {
      const res = await axios.get(`https://api.razorpay.com/v2/accounts/${accountId}/products/${productId}`, { headers });
      return res.data?.activation_status || null;
    }
    const res = await axios.get(`https://api.razorpay.com/v2/accounts/${accountId}`, { headers });
    return res.data?.activation_details?.status || res.data?.status || null;
  } catch (err: any) {
    Log.error(`[getRouteAccountActivationStatus] Failed for ${accountId}/${productId || 'acct'}`, { message: err?.message });
    return null;
  }
}

export function isRazorpayConfigured(): boolean {
  return !!(razorpayConfig.key_id && razorpayConfig.key_secret);
}


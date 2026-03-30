/**
 * IDtoAI Verification Service — PAN & GSTIN
 * PAN docs:  https://idtoai.readme.io/reference/post_pan-all-in-one
 * GST docs:  https://idtoai.readme.io/reference/post_gst-verification-basic
 */
import { Log } from "@services/loggerService";

const IDTOAI_API_KEY = process.env.IDTOAI_API_KEY || "";
const IDTOAI_CLIENT_ID = process.env.IDTOAI_CLIENT_ID || "";

const IDTOAI_PAN_URL = "https://dev.idto.ai/verify/pan_all_in_one";
const IDTOAI_GST_URL = "https://dev.idto.ai/verify/gst_verification_basic";

/** Returns true if IDtoAI API credentials are configured. */
export function isConfigured(): boolean {
  return !!(IDTOAI_API_KEY && IDTOAI_CLIENT_ID);
}

// ─── PAN Verification ────────────────────────────────────────────────────────

export interface PANVerificationResponse {
  success: boolean;
  pan_number?: string;
  full_name?: string;
  dob?: string | null;
  gender?: string | null;
  category?: string; // "person" | "business"
  status?: string;   // "success" | "failure" | "partial"
  address?: {
    value?: string;
    first_line?: string;
    second_line?: string;
    locality?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  email?: string | null;
  phone_number?: string | null;
  aadhaar_linked?: boolean;
  error?: string;
  raw?: any;
}

/**
 * Verify a PAN number using IDtoAI pan_all_in_one API.
 * Returns full_name, address, category etc.
 */
export async function verifyPAN(panNumber: string): Promise<PANVerificationResponse> {
  if (!isConfigured()) {
    Log.warn("[idtoai] Missing IDTOAI_API_KEY or IDTOAI_CLIENT_ID env vars — skipping PAN verification");
    return { success: false, error: "PAN verification is temporarily unavailable. Please try again later." };
  }

  try {
    const response = await fetch(IDTOAI_PAN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": IDTOAI_API_KEY,
        "X-Client-ID": IDTOAI_CLIENT_ID,
      },
      body: JSON.stringify({ pan_number: panNumber.toUpperCase() }),
    });

    const data = await response.json();

    if (!response.ok) {
      Log.error("[idtoai] PAN API error", { status: response.status, data });
      return { success: false, error: data?.message || `API returned ${response.status}`, raw: data };
    }

    if (data.status === "failure") {
      return { success: false, error: "Invalid PAN number or not found", raw: data };
    }

    return {
      success: true,
      pan_number: data.pan_number,
      full_name: data.full_name,
      dob: data.dob,
      gender: data.gender,
      category: data.category,
      status: data.status,
      address: data.address,
      email: data.email,
      phone_number: data.phone_number,
      aadhaar_linked: data.aadhaar_linked,
      raw: data,
    };
  } catch (error: any) {
    Log.error("[idtoai] PAN request failed", { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Match PAN API response (name + address) against user-provided details.
 */
export function matchPANDetails(
  apiResult: PANVerificationResponse,
  taxResidence: { city?: string; zipCode?: string; state?: string },
  options: { userName?: string }
): { matches: boolean; reason?: string } {
  const reasons: string[] = [];

  // Name match
  if (apiResult.full_name && options.userName) {
    const panName = apiResult.full_name.trim().toLowerCase();
    const userNameNorm = options.userName.trim().toLowerCase();
    if (panName && userNameNorm && !panName.includes(userNameNorm) && !userNameNorm.includes(panName)) {
      reasons.push(`Name mismatch: PAN registered to "${apiResult.full_name}", you entered "${options.userName}"`);
    }
  }

  // Address match
  if (apiResult.address) {
    const panZip = (apiResult.address.zip || "").trim();
    const userPin = (taxResidence.zipCode || "").trim();
    if (panZip && userPin && panZip !== userPin) {
      reasons.push(`PIN code mismatch: PAN has ${panZip}, you entered ${userPin}`);
    }

    const panCity = (apiResult.address.city || apiResult.address.district || "").trim().toLowerCase();
    const userCity = (taxResidence.city || "").trim().toLowerCase();
    if (panCity && userCity && !panCity.includes(userCity) && !userCity.includes(panCity)) {
      reasons.push(`City mismatch: PAN has "${apiResult.address.city || apiResult.address.district}", you entered "${taxResidence.city}"`);
    }
  }

  if (reasons.length > 0) {
    return { matches: false, reason: reasons.join("; ") };
  }

  return { matches: true };
}

// ─── GSTIN Verification ──────────────────────────────────────────────────────

export interface GSTVerificationResponse {
  success: boolean;
  gst_number?: string;
  status?: string;
  legal_name_of_business?: string;
  current_registration_status?: string;
  taxpayer_type?: string;
  business_constitution?: string;
  register_date?: string;
  nature_of_business?: string[];
  primary_business_address?: {
    building_name?: string;
    floor_number?: string;
    location?: string;
    city?: string;
    district?: string;
    state?: string;
    pin?: string;
    latitude?: string | null;
    longitude?: string | null;
  };
  error?: string;
  raw?: any;
}

/**
 * Verify a GSTIN number using IDtoAI basic GST verification API.
 */
export async function verifyGSTIN(gstNumber: string): Promise<GSTVerificationResponse> {
  if (!isConfigured()) {
    Log.warn("[idtoai] Missing IDTOAI_API_KEY or IDTOAI_CLIENT_ID env vars — skipping GSTIN verification");
    return { success: false, error: "GSTIN verification is temporarily unavailable. Please try again later." };
  }

  try {
    const response = await fetch(IDTOAI_GST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": IDTOAI_API_KEY,
        "X-Client-ID": IDTOAI_CLIENT_ID,
      },
      body: JSON.stringify({ gst_number: gstNumber.toUpperCase() }),
    });

    const data = await response.json();

    if (!response.ok) {
      Log.error("[idtoai] GST API error", { status: response.status, data });
      return { success: false, error: data?.message || `API returned ${response.status}`, raw: data };
    }

    return {
      success: true,
      gst_number: data.gst_number,
      status: data.status,
      legal_name_of_business: data.legal_name_of_business,
      current_registration_status: data.current_registration_status,
      taxpayer_type: data.taxpayer_type,
      business_constitution: data.business_constitution,
      register_date: data.register_date,
      nature_of_business: data.nature_of_business,
      primary_business_address: data.primary_business_address,
      raw: data,
    };
  } catch (error: any) {
    Log.error("[idtoai] GST request failed", { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Match GSTIN API response (name + address) against user-provided details.
 */
export function matchGSTINDetails(
  apiResult: GSTVerificationResponse,
  taxResidence: { city?: string; zipCode?: string; state?: string },
  options: { userName?: string }
): { matches: boolean; reason?: string } {
  const reasons: string[] = [];

  // Name match
  if (apiResult.legal_name_of_business && options.userName) {
    const gstName = apiResult.legal_name_of_business.trim().toLowerCase();
    const userNameNorm = options.userName.trim().toLowerCase();
    if (gstName && userNameNorm && !gstName.includes(userNameNorm) && !userNameNorm.includes(gstName)) {
      reasons.push(`Name mismatch: GSTIN registered to "${apiResult.legal_name_of_business}", you entered "${options.userName}"`);
    }
  }

  // Address match
  const gstAddress = apiResult.primary_business_address;
  if (gstAddress) {
    const gstPin = (gstAddress.pin || "").trim();
    const userPin = (taxResidence.zipCode || "").trim();
    if (gstPin && userPin && gstPin !== userPin) {
      reasons.push(`PIN code mismatch: GSTIN has ${gstPin}, you entered ${userPin}`);
    }

    const gstCity = (gstAddress.city || gstAddress.district || "").trim().toLowerCase();
    const userCity = (taxResidence.city || "").trim().toLowerCase();
    if (gstCity && userCity && !gstCity.includes(userCity) && !userCity.includes(gstCity)) {
      reasons.push(`City mismatch: GSTIN has "${gstAddress.city || gstAddress.district}", you entered "${taxResidence.city}"`);
    }
  }

  if (reasons.length > 0) {
    return { matches: false, reason: reasons.join("; ") };
  }

  return { matches: true };
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/**
 * Validate PAN format locally: AAAAA9999A (5 letters, 4 digits, 1 letter).
 */
export function validatePanFormat(panNumber: string): { valid: boolean; reason?: string } {
  const pan = panNumber.trim().toUpperCase();
  if (!PAN_REGEX.test(pan)) {
    return { valid: false, reason: `Invalid PAN format "${pan}". Expected format: ABCDE1234F` };
  }
  return { valid: true };
}

/**
 * Extract PAN from GSTIN (positions 3-12).
 * GSTIN: [2-digit state][10-char PAN][entity][Z][checksum]
 */
export function extractPanFromGSTIN(gstin: string): string {
  return gstin.substring(2, 12).toUpperCase();
}

/**
 * Validate PAN matches the PAN embedded in GSTIN (positions 3-12).
 */
export function validatePanWithGSTIN(
  panNumber: string,
  gstin: string
): { matches: boolean; reason?: string } {
  const panInGstin = extractPanFromGSTIN(gstin);
  const userPan = panNumber.trim().toUpperCase();

  if (panInGstin !== userPan) {
    return {
      matches: false,
      reason: `PAN does not match GSTIN. GSTIN contains PAN "${panInGstin}", you entered "${userPan}"`
    };
  }

  return { matches: true };
}

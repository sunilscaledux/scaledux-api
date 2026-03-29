/**
 * IDtoAI GSTIN Verification Service
 * API docs: https://idtoai.readme.io/reference/post_gst-verification-basic
 */
import { Log } from "@services/loggerService";

const IDTOAI_API_URL = "https://dev.idto.ai/verify/gst_verification_basic";
const IDTOAI_API_KEY = process.env.IDTOAI_API_KEY || "";
const IDTOAI_CLIENT_ID = process.env.IDTOAI_CLIENT_ID || "";

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
/** Returns true if IDtoAI API credentials are configured. */
export function isConfigured(): boolean {
  return !!(IDTOAI_API_KEY && IDTOAI_CLIENT_ID);
}

export async function verifyGSTIN(gstNumber: string): Promise<GSTVerificationResponse> {
  if (!isConfigured()) {
    Log.warn("[idtoai] Missing IDTOAI_API_KEY or IDTOAI_CLIENT_ID env vars — skipping");
    return { success: false, error: "GSTIN verification service not configured" };
  }

  try {
    const response = await fetch(IDTOAI_API_URL, {
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
      Log.error("[idtoai] API error", { status: response.status, data });
      return { success: false, error: data?.message || `API returned ${response.status}`, raw: data };
    }

    // The API returns gst_number, status, legal_name_of_business, primary_business_address, etc.
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
    Log.error("[idtoai] Request failed", { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Check if the GSTIN address matches the user's tax residence address.
 * Compares city and PIN code (state names may differ in format).
 */
export function matchAddress(
  gstAddress: GSTVerificationResponse["primary_business_address"],
  taxResidence: { city?: string; zipCode?: string; state?: string }
): { matches: boolean; reason?: string } {
  if (!gstAddress) {
    return { matches: false, reason: "No address returned from GSTIN verification" };
  }

  const reasons: string[] = [];

  const gstPin = (gstAddress.pin || "").trim();
  const userPin = (taxResidence.zipCode || "").trim();
  if (gstPin && userPin && gstPin !== userPin) {
    reasons.push(`PIN code mismatch: GSTIN has ${gstPin}, user entered ${userPin}`);
  }

  const gstCity = (gstAddress.city || gstAddress.district || "").trim().toLowerCase();
  const userCity = (taxResidence.city || "").trim().toLowerCase();
  if (gstCity && userCity && !gstCity.includes(userCity) && !userCity.includes(gstCity)) {
    reasons.push(`City mismatch: GSTIN has "${gstAddress.city || gstAddress.district}", user entered "${taxResidence.city}"`);
  }

  if (reasons.length > 0) {
    return { matches: false, reason: reasons.join("; ") };
  }

  return { matches: true };
}

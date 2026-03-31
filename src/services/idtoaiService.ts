/**
 * IDtoAI Verification Service — PAN & GSTIN
 * PAN docs:  https://idtoai.readme.io/reference/post_pan-verification
 * GST docs:  https://idtoai.readme.io/reference/post_gst-verification-basic
 */
import axios from "axios";
import { Log } from "@services/loggerService";
import idtoaiConfig from "@config/idtoai";

/** Returns true if IDtoAI API credentials are configured. */
export function isConfigured(): boolean {
  return !!(idtoaiConfig.apiKey && idtoaiConfig.clientId);
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
  error?: string;
  raw?: any;
}

/**
 * Verify a PAN number using IDtoAI basic PAN verification API.
 * Returns full_name, dob, gender, category.
 */
export async function verifyPAN(panNumber: string, uniqueId?: string): Promise<PANVerificationResponse> {
  const tag = uniqueId ? `[idtoai][${uniqueId}]` : "[idtoai]";
  if (!isConfigured()) {
    Log.warn(`${tag} Missing idtoaiConfig.apiKey or idtoaiConfig.clientId env vars — skipping PAN verification`);
    return { success: false, error: "PAN verification is temporarily unavailable. Please try again later." };
  }

  try {
    const response = await axios.post(idtoaiConfig.panUrl, { pan_number: panNumber.toUpperCase() }, {
      headers: idtoaiConfig.headers,
    });

    const data = response.data;

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
      raw: data,
    };
  } catch (error: any) {
    const status = error.response?.status;
    const data = error.response?.data;
    if (status) {
      Log.error(`${tag} PAN API error`, { status, data });
      return { success: false, error: data?.message || data?.detail || `API returned ${status}`, raw: data };
    }
    Log.error(`${tag} PAN request failed`, { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Match PAN API response name against user-provided name.
 */
export function matchPANDetails(
  apiResult: PANVerificationResponse,
  options: { userName?: string }
): { matches: boolean; reason?: string } {
  if (apiResult.full_name && options.userName) {
    const panName = apiResult.full_name.trim().toLowerCase();
    const userNameNorm = options.userName.trim().toLowerCase();
    if (panName && userNameNorm && !panName.includes(userNameNorm) && !userNameNorm.includes(panName)) {
      return { matches: false, reason: `Name mismatch: PAN registered to "${apiResult.full_name}", you entered "${options.userName}"` };
    }
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
export async function verifyGSTIN(gstNumber: string, uniqueId?: string): Promise<GSTVerificationResponse> {
  const tag = uniqueId ? `[idtoai][${uniqueId}]` : "[idtoai]";
  if (!isConfigured()) {
    Log.warn(`${tag} Missing idtoaiConfig.apiKey or idtoaiConfig.clientId env vars — skipping GSTIN verification`);
    return { success: false, error: "GSTIN verification is temporarily unavailable. Please try again later." };
  }

  try {
    const response = await axios.post(idtoaiConfig.gstUrl, { gst_number: gstNumber.toUpperCase() }, {
      headers: idtoaiConfig.headers,
    });

    const data = response.data;

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
    const status = error.response?.status;
    const data = error.response?.data;
    if (status) {
      Log.error(`${tag} GST API error`, { status, data });
      return { success: false, error: data?.message || data?.detail || `API returned ${status}`, raw: data };
    }
    Log.error(`${tag} GST request failed`, { error: error.message });
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

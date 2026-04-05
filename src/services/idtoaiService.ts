/**
 * IDtoAI Verification Service — PAN & GSTIN
 * PAN docs:  https://idtoai.readme.io/reference/post_pan-verification
 * GST docs:  https://idtoai.readme.io/reference/post_gst-verification-basic
 */
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { Log } from "@services/loggerService";
import idtoaiConfig from "@config/idtoai";

/** Extract a human-readable error string from IDtoAI error responses.
 *  `detail` can be a string, an object with `msg`, or an array of `{msg}` objects. */
function parseApiError(data: any, fallback: string): string {
  const detail = data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d: any) => d?.msg || JSON.stringify(d)).join('; ');
  }
  if (detail && typeof detail === 'object' && detail.msg) return detail.msg;
  if (typeof data?.message === 'string') return data.message;
  return fallback;
}

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
      return { success: false, error: parseApiError(data, `API returned ${status}`), raw: data };
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
      return { success: false, error: parseApiError(data, `API returned ${status}`), raw: data };
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

// ─── CIN / MCA Verification ─────────────────────────────────────────────────

export interface CINVerificationResponse {
  success: boolean;
  companyName?: string;
  cin?: string;
  companyStatus?: string;
  dateOfIncorporation?: string;
  registeredAddress?: string;
  directors?: { name: string; din: string }[];
  error?: string;
  raw?: any;
}

export async function verifyCIN(cinNumber: string, uniqueId?: string): Promise<CINVerificationResponse> {
  const tag = uniqueId ? `[idtoai][${uniqueId}]` : "[idtoai]";
  if (!isConfigured()) {
    return { success: false, error: "CIN verification is temporarily unavailable." };
  }

  try {
    const response = await axios.post(idtoaiConfig.cinUrl, { id_number: cinNumber.toUpperCase() }, {
      headers: idtoaiConfig.headers,
    });

    const data = response.data;
    const info = data.response?.details?.company_info || data.company_info || data.result?.company_info || data;

    return {
      success: true,
      companyName: info.company_name || info.companyName,
      cin: info.cin || cinNumber,
      companyStatus: info.company_status || info.status,
      dateOfIncorporation: info.date_of_incorporation,
      registeredAddress: info.registered_address,
      directors: (data.response?.details?.directors || data.directors || data.result?.directors || []).map((d: any) => ({
        name: d.director_name || d.name,
        din: d.din_number || d.din,
      })),
      raw: data,
    };
  } catch (error: any) {
    const status = error.response?.status;
    const errData = error.response?.data;
    if (status) {
      Log.error(`${tag} CIN API error`, { status, data: errData });
      return { success: false, error: parseApiError(errData, `API returned ${status}`), raw: errData };
    }
    Log.error(`${tag} CIN request failed`, { error: error.message });
    return { success: false, error: error.message };
  }
}

// ─── Pennyless Bank Account Verification ────────────────────────────────────

export interface BankVerificationResponse {
  success: boolean;
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  branch?: string;
  accountStatus?: string;
  error?: string;
  raw?: any;
}

/**
 * Verify a bank account using IDtoAI pennyless verification.
 * No monetary transaction — validates via banking networks.
 */
export async function verifyBankAccount(
  accountNumber: string,
  ifsc: string,
  uniqueId?: string,
): Promise<BankVerificationResponse> {
  const tag = uniqueId ? `[idtoai][${uniqueId}]` : "[idtoai]";
  if (!isConfigured()) {
    Log.warn(`${tag} IDtoAI not configured — skipping bank verification`);
    return { success: false, error: "Bank verification is temporarily unavailable. Please try again later." };
  }

  try {
    const payload = {
      account_number: accountNumber,
      ifsc_code: ifsc.toUpperCase(),
    };
    Log.info(`${tag} Bank verification request`, { url: idtoaiConfig.bankVerificationUrl, payload });
    const response = await axios.post(idtoaiConfig.bankVerificationUrl, payload, { headers: idtoaiConfig.headers });
    Log.info(`${tag} Bank verification response`, { data: JSON.stringify(response.data) });

    const data = response.data;
    const result = data.result || data;

    const status = (result.account_status || result.status || data.status || "").toLowerCase();

    if (status === "failure" || status === "invalid" || status === "inactive") {
      return {
        success: false,
        error: result.message || "Bank account is invalid or inactive. Please check your details.",
        accountStatus: status,
        raw: data,
      };
    }

    Log.info(`${tag} Bank verified: holder=${result.account_holder_name || result.full_name}, status=${status}`);

    return {
      success: true,
      accountHolderName: result.account_holder_name || result.full_name || result.beneficiary_name || "",
      accountNumber: result.account_number || accountNumber,
      ifsc: result.ifsc || ifsc,
      bankName: result.bank_name || result.bank || "",
      branch: result.branch || "",
      accountStatus: status,
      raw: data,
    };
  } catch (error: any) {
    const errStatus = error.response?.status;
    const errData = error.response?.data;
    if (errStatus) {
      Log.error(`${tag} Bank verification error`, { status: errStatus, data: JSON.stringify(errData) });
      return { success: false, error: parseApiError(errData, `API returned ${errStatus}`), raw: errData };
    }
    Log.error(`${tag} Bank verification failed`, { error: error.message });
    return { success: false, error: error.message };
  }
}

// ─── DigiLocker — Aadhaar Verification ──────────────────────────────────────

export interface DigilockerAadhaarResponse {
  success: boolean;
  name?: string;
  dob?: string;
  gender?: string;
  aadhaarUid?: string;
  aadhaarReferenceNumber?: string;
  address?: {
    careOf?: string;
    house?: string;
    street?: string;
    landmark?: string;
    locality?: string;
    vtc?: string;
    district?: string;
    subDistrict?: string;
    state?: string;
    country?: string;
    pincode?: string;
    postOffice?: string;
  };
  image?: string; // base64 photo
  error?: string;
  raw?: any;
}

/**
 * Initiate DigiLocker session — returns auth_url to redirect user to.
 */
export async function digilockerInitiateSession(
  redirectUrl: string,
  state: string,
  userId?: string,
): Promise<{ success: boolean; authUrl?: string; error?: string; raw?: any }> {
  const tag = userId ? `[digilocker][${userId}]` : "[digilocker]";
  if (!isConfigured()) {
    Log.warn(`${tag} IDtoAI not configured — skipping DigiLocker`);
    return { success: false, error: "DigiLocker verification is temporarily unavailable." };
  }

  try {
    const response = await axios.post(idtoaiConfig.digilocker.initiateSession, {
      consent: true,
      consent_purpose: "KYC verification",
      redirect_url: redirectUrl,
      redirect_to_signup: true,
      documents_for_consent: ["ADHAR","DRVLC"],
    }, { headers: idtoaiConfig.headers });

    const data = response.data;
    const authUrl = data.url || data.auth_url || data.result?.auth_url || data.result?.url;

    if (authUrl) {
      Log.info(`${tag} DigiLocker session initiated`);
      return { success: true, authUrl, raw: data };
    }

    Log.error(`${tag} DigiLocker initiate — no auth_url`, { data });
    return { success: false, error: data.message || "Failed to initiate DigiLocker session", raw: data };
  } catch (error: any) {
    const status = error.response?.status;
    const data = error.response?.data;
    if (status) {
      Log.error(`${tag} DigiLocker initiate error`, { status, data });
      return { success: false, error: parseApiError(data, `API returned ${status}`), raw: data };
    }
    Log.error(`${tag} DigiLocker initiate failed`, { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Exchange DigiLocker callback code for reference_key.
 */
export async function digilockerGetReference(
  code: string,
  codeVerifier: string,
  uniqueId?: string,
): Promise<{ success: boolean; referenceKey?: string; error?: string; raw?: any }> {
  const tag = uniqueId ? `[digilocker][${uniqueId}]` : "[digilocker]";

  try {
    const response = await axios.post(idtoaiConfig.digilocker.getReference, {
      code,
      code_verifier: codeVerifier,
    }, { headers: idtoaiConfig.headers });

    const data = response.data;
    const result = data.result || data;

    if (result.reference_key) {
      return { success: true, referenceKey: result.reference_key, raw: data };
    }

    Log.error(`${tag} DigiLocker get_reference — no reference_key`, { data });
    return { success: false, error: result.message || "Failed to get reference key", raw: data };
  } catch (error: any) {
    const status = error.response?.status;
    const data = error.response?.data;
    if (status) {
      Log.error(`${tag} DigiLocker get_reference error`, { status, data });
      return { success: false, error: parseApiError(data, `API returned ${status}`), raw: data };
    }
    Log.error(`${tag} DigiLocker get_reference failed`, { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Fetch Aadhaar data using reference_key from DigiLocker.
 */
export async function digilockerFetchAadhaar(
  referenceKey: string,
  uniqueId?: string,
): Promise<DigilockerAadhaarResponse> {
  const tag = uniqueId ? `[digilocker][${uniqueId}]` : "[digilocker]";

  try {
    const response = await axios.post(idtoaiConfig.digilocker.fetchAadhaar, {
      reference_key: referenceKey,
    }, { headers: idtoaiConfig.headers });

    const rawData = response.data;
    let xmlStr = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);

    // IDtoAI may return XML as a string directly or wrapped in JSON
    if (typeof rawData === 'object' && !Array.isArray(rawData)) {
      // Find the XML string in the response — could be the whole thing or a nested field
      const possibleXml = rawData.xml || rawData.data || rawData.result || rawData;
      if (typeof possibleXml === 'string' && possibleXml.includes('<')) {
        xmlStr = possibleXml;
      }
    }

    Log.info(`${tag} fetch_aadhaar raw type: ${typeof rawData}, isXML: ${xmlStr.includes('<KycRes')}`);

    // Parse the Aadhaar XML.g
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
    const parsed = parser.parse(xmlStr);

    // Navigate XML structure: Certificate > CertificateData > KycRes > UidData
    const kycRes = parsed?.Certificate?.CertificateData?.KycRes || parsed?.KycRes || parsed;
    const uidData = kycRes?.UidData || {};
    const poi = uidData?.Poi || {}; // Proof of Identity
    const poa = uidData?.Poa || {}; // Proof of Address
    const pht = uidData?.Pht || ''; // Photo (base64)
    const aadhaarUid = uidData?.uid || '';

    const name = poi.name || '';
    const dob = poi.dob || '';
    const gender = poi.gender || '';

    const address = {
      careOf: poa.co || '',
      house: poa.house || '',
      street: poa.street || '',
      landmark: poa.lm || '',
      locality: poa.loc || '',
      vtc: poa.vtc || '',
      district: poa.dist || '',
      subDistrict: poa.subdist || '',
      state: poa.state || '',
      country: poa.country || 'India',
      pincode: poa.pc || '',
      postOffice: poa.po || '',
    };

    Log.info(`${tag} Parsed: name=${name}, dob=${dob}, gender=${gender}, uid=${aadhaarUid}, state=${address.state}, district=${address.district}`);

    return {
      success: true,
      name,
      dob,
      gender,
      aadhaarUid,
      address,
      image: typeof pht === 'string' ? pht : '',
      raw: rawData,
    };
  } catch (error: any) {
    const status = error.response?.status;
    const data = error.response?.data;
    if (status) {
      Log.error(`${tag} DigiLocker fetch_aadhaar error`, { status, data });
      return { success: false, error: parseApiError(data, `API returned ${status}`), raw: data };
    }
    Log.error(`${tag} DigiLocker fetch_aadhaar failed`, { error: error.message });
    return { success: false, error: error.message };
  }
}

// ─── DigiLocker — Driving Licence ───────────────────────────────────────────

export interface DigilockerDrivingLicenceResponse {
  success: boolean;
  name?: string;
  dob?: string;
  dlNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  vehicleClasses?: string[];
  address?: Record<string, string>;
  image?: string;
  error?: string;
  raw?: any;
}

/**
 * Fetch Driving Licence data using reference_key from DigiLocker.
 * Uses the same reference_key obtained after DigiLocker OAuth.
 */
export async function digilockerFetchDrivingLicence(
  referenceKey: string,
  uniqueId?: string,
): Promise<DigilockerDrivingLicenceResponse> {
  const tag = uniqueId ? `[digilocker][${uniqueId}]` : "[digilocker]";

  try {
    const response = await axios.post(idtoaiConfig.digilocker.fetchDrivingLicence, {
      reference_key: referenceKey,
    }, { headers: idtoaiConfig.headers });

    const data = response.data;
    const result = data.result || data;

    const name = result.name || result.full_name || '';
    const dob = result.dob || result.date_of_birth || '';
    const dlNumber = result.dl_number || result.licence_number || '';
    const issueDate = result.issue_date || '';
    const expiryDate = result.expiry_date || result.validity || '';
    const vehicleClasses = result.vehicle_classes || result.cov || [];
    const image = result.image || result.photo || '';
    const address = result.address || {};

    Log.info(`${tag} DL fetched: name=${name}, dlNumber=${dlNumber}, expiry=${expiryDate}`);

    return {
      success: true,
      name,
      dob,
      dlNumber,
      issueDate,
      expiryDate,
      vehicleClasses: Array.isArray(vehicleClasses) ? vehicleClasses : [vehicleClasses].filter(Boolean),
      address: typeof address === 'object' ? address : {},
      image: typeof image === 'string' ? image : '',
      raw: data,
    };
  } catch (error: any) {
    const status = error.response?.status;
    const errData = error.response?.data;
    if (status) {
      Log.error(`${tag} DigiLocker fetch_driving_licence error`, { status, data: errData });
      return { success: false, error: parseApiError(errData, `API returned ${status}`), raw: errData };
    }
    Log.error(`${tag} DigiLocker fetch_driving_licence failed`, { error: error.message });
    return { success: false, error: error.message };
  }
}

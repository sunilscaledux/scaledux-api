const IDTOAI_BASE = (process.env.IDTOAI_BASE_URL || "https://prod.idto.ai/verify").replace(/\/$/, "");

const idtoaiConfig = {
  apiKey: (process.env.IDTOAI_API_KEY || "").trim(),
  clientId: (process.env.IDTOAI_CLIENT_ID || "").trim(),
  panUrl: process.env.IDTOAI_PAN_URL || `${IDTOAI_BASE}/pan_verification`,
  gstUrl: process.env.IDTOAI_GST_URL || `${IDTOAI_BASE}/gst_verification_basic`,
  digilocker: {
    initiateSession: `${IDTOAI_BASE}/digilocker/initiate_session`,
    getReference: `${IDTOAI_BASE}/digilocker/get_reference`,
    fetchAadhaar: `${IDTOAI_BASE}/digilocker/fetch_aadhaar`,
  },
  get headers() {
    return {
      "accept": "application/json",
      "content-type": "application/json",
      "X-API-KEY": idtoaiConfig.apiKey,
      "X-Client-ID": idtoaiConfig.clientId,
    };
  },
};

export default idtoaiConfig;

const idtoaiConfig = {
  apiKey: (process.env.IDTOAI_API_KEY || "").trim(),
  clientId: (process.env.IDTOAI_CLIENT_ID || "").trim(),
  panUrl: process.env.IDTOAI_PAN_URL || "https://prod.idto.ai/verify/pan_verification",
  gstUrl: process.env.IDTOAI_GST_URL || "https://api.idto.ai/verify/gst_verification_basic",
  get headers() {
    return {
      "accept": "application/json",
      "content-type": "application/json",
      "X-API-KEY": this.apiKey,
      "X-Client-ID": this.clientId,
    };
  },
};

export default idtoaiConfig;

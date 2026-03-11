const razorpayConfig = {
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
  /** Razorpay X (payouts, contacts, fund accounts) API base. */
  xBaseUrl: process.env.RAZORPAY_X_BASE_URL || "https://api.razorpay.com/v1",
};

export default razorpayConfig;
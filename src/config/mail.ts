const mailConfig = {
    ZEPTO_URL: process.env.ZEPTO_URL || "api.zeptomail.in/",
    ZEPTO_TOKEN: process.env.ZEPTO_TOKEN,
    ZEPTO_FROM_EMAIL: process.env.ZEPTO_FROM_EMAIL || "noreply@scaledux.com",
    ZEPTO_FROM_NAME: process.env.ZEPTO_FROM_NAME || "ScaleDux",
    APP_NAME: process.env.APP_NAME || "ScaleDux",
    COMPANY_NAME: process.env.COMPANY_NAME || "ScaleDux",
    OTP_VALIDITY_MINUTES: parseInt(process.env.OTP_VALIDITY_MINUTES || "10"),
    RESET_LINK_VALIDITY_MINUTES: parseInt(process.env.RESET_LINK_VALIDITY_MINUTES || "5"),
}

export default mailConfig;
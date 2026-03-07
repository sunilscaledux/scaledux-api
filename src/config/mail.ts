const mailConfig = {
    ZEPTO_URL: process.env.ZEPTO_URL || "api.zeptomail.in/",
    ZEPTO_TOKEN: process.env.ZEPTO_TOKEN,
    ZEPTO_FROM_EMAIL: process.env.ZEPTO_FROM_EMAIL || "noreply@scaledux.com",
    ZEPTO_FROM_NAME: process.env.ZEPTO_FROM_NAME || "ScaleDux",
    APP_NAME: process.env.APP_NAME || "ScaleDux",
    COMPANY_NAME: process.env.COMPANY_NAME || "ScaleDux",
    /** Used in email layout footer (from env) */
    FOOTER_MESSAGE: process.env.EMAIL_FOOTER_MESSAGE || "Best regards,",
    FOOTER_NOTE: process.env.EMAIL_FOOTER_NOTE || "This is an automated email. Please do not reply to this message.",
    OTP_VALIDITY_MINUTES: parseInt(process.env.OTP_VALIDITY_MINUTES || "10"),
    RESET_LINK_VALIDITY_MINUTES: parseInt(process.env.RESET_LINK_VALIDITY_MINUTES || "5"),
}

export default mailConfig;
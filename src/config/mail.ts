const mailConfig = {
    SMTP_HOST: process.env.SMTP_HOST || "",
    SMTP_PORT: parseInt(process.env.SMTP_PORT || "587"),
    SMTP_USER: process.env.SMTP_USER || "",
    SMTP_PASS: process.env.SMTP_PASS || "",
    SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || process.env.ZEPTO_FROM_EMAIL || "noreply@scaledux.com",
    SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || process.env.ZEPTO_FROM_NAME || "ScaleDux",
    APP_NAME: process.env.APP_NAME || "ScaleDux",
    COMPANY_NAME: process.env.COMPANY_NAME || process.env.APP_NAME || "ScaleDux",
    OTP_VALIDITY_MINUTES: parseInt(process.env.OTP_VALIDITY_MINUTES || "10"),
    RESET_LINK_VALIDITY_MINUTES: parseInt(process.env.RESET_LINK_VALIDITY_MINUTES || "5"),
}

export default mailConfig;

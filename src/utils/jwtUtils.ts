import jwt from "jsonwebtoken";

export function generateTokenAndSetCookie(
  user: any,
  rememberMe: boolean = false
) {
  // Set expiration based on rememberMe flag
  const tokenExpiry = rememberMe ? "7d" : "24h";
  const cookieMaxAge = rememberMe
    ? 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    : 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  const token = jwt.sign(
    {
      id: user.id,
      unique_id: user.unique_id || user.id, // Fallback to id if unique_id is not available
      email: user.email,
      phone: user.phone,
      rememberMe: rememberMe,
    },
    process.env.JWT_SECRET || "fallback-secret",
    { expiresIn: tokenExpiry }
  );

  const isProduction = process.env.NODE_ENV === "production";

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction, // local = false, staging = true
    sameSite: isProduction ? "none" : "lax", // local works on lax, staging requires none
    maxAge: cookieMaxAge,
    path: "/",
    domain: isProduction ? ".scaledux.com" : undefined,
  };

  console.log(
    `🍪 Token generated with ${rememberMe ? "7 days" : "24 hours"} expiry`
  );

  return { token, cookieOptions, expiresIn: tokenExpiry };
}

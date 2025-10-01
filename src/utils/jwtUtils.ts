import jwt from "jsonwebtoken";

export function generateTokenAndSetCookie(user: any) {
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      phone: user.phone,
    },
    process.env.JWT_SECRET || "fallback-secret",
    { expiresIn: "24h" }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as "lax" | "strict" | "none",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: "/",
  };

  return { token, cookieOptions };
}

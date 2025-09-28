import jwt, { SignOptions } from 'jsonwebtoken';
import { UserDetail } from '@module/user/userTypes';

/**
 * Generate JWT token for user
 */
export function generateJwtToken(user: any): string {
  const payload = {
    id: user.id,
    email: user.email,
    phone: user.phone,
    FirstName: user.FirstName,
    LastName: user.LastName
  };

  const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
  
  return jwt.sign(payload, secret, { expiresIn: '24h' });
}

/**
 * Verify JWT token
 */
export function verifyJwtToken(token: string): any {
  try {
    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Decode JWT token without verification (for debugging)
 */
export function decodeJwtToken(token: string): any {
  return jwt.decode(token);
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

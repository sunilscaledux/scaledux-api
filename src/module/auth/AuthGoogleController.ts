import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { generateTokenAndSetCookie } from '../../utils/jwtUtils';
import { prisma } from '../../services/prismaService';
import axios from 'axios';
import { ulid } from 'ulid';

interface GoogleCallbackRequest {
  code: string;
  redirectUri: string;
}

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

const googleCallback = async (req: Request, res: Response) => {
  try {
    const { code, redirectUri }: GoogleCallbackRequest = req.body;

    if (!code) {
      return ApiResponse.error(res, 'Authorization code is required');
    }

    console.log('🔐 Google OAuth callback received');

    // Step 1: Exchange code for access token
    const tokenResponse = await axios.post<GoogleTokenResponse>('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    const { access_token } = tokenResponse.data;

    // Step 2: Get user info from Google
    const userResponse = await axios.get<GoogleUserInfo>(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`
    );

    const googleUser = userResponse.data;

    // Step 3: Check if user exists with this email
    let user = await prisma.user.findUnique({
      where: { email: googleUser.email }
    });

    if (user) {
      // User exists, update their Google info if needed
      if (!user.googleId && googleUser.id) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.id,
            provider: "google",
          },
        });
      }
    } else {
      // Create new user from Google OAuth
      const [firstName, ...lastNameParts] = googleUser.name.split(' ');
      const lastName = lastNameParts.join(' ') || '';

      user = await prisma.user.create({
        data: {
          first_name: firstName,
          last_name: lastName,
          email: googleUser.email,
          googleId: googleUser.id,
          provider: "google",
          email_verified_at: new Date(),
          status: 1,
        },
      });

      // Create FreelancerProfile with unique_id
      await prisma.freelancerProfile.create({
        data: {
          user_id: user.id,
          unique_id: ulid(),
        },
      });

      console.log('✅ New user created via Google OAuth:', user.email);
    }

    // Generate JWT token and set cookie
    const { token, cookieOptions, expiresIn } = generateTokenAndSetCookie(user, false);
    res.cookie('auth_token', token, cookieOptions);

    return ApiResponse.success(
      res,
      {
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
        },
        token,
        authenticated: true,
        expiresIn: expiresIn,
        provider: 'google',
      },
      'Google login successful'
    );

  } catch (error: any) {
    console.error('❌ Google OAuth error:', error);
    return ApiResponse.error(res, 'Google authentication failed');
  }
}

export { googleCallback };

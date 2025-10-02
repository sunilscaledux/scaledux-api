import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { generateTokenAndSetCookie } from '../../utils/jwtUtils';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface LinkedInCallbackRequest {
  code: string;
  redirectUri: string;
}

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface LinkedInUserInfo {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
}

interface LinkedInEmailInfo {
  elements: Array<{
    'handle~': {
      emailAddress: string;
    };
    handle: string;
  }>;
}

interface LinkedInProfilePicture {
  profilePicture?: {
    'displayImage~': {
      elements: Array<{
        identifiers: Array<{
          identifier: string;
        }>;
      }>;
    };
  };
}

export async function linkedinCallback(req: Request, res: Response) {
  try {
    const { code, redirectUri }: LinkedInCallbackRequest = req.body;

    if (!code) {
      return ApiResponse.error(res, 'Authorization code is required');
    }

    console.log('🔐 LinkedIn OAuth callback received');

    // Step 1: Exchange code for access token
    const tokenResponse = await axios.post<LinkedInTokenResponse>(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token } = tokenResponse.data;

    // Step 2: Get user basic info from LinkedIn
    const userResponse = await axios.get<LinkedInUserInfo>(
      'https://api.linkedin.com/v2/people/~:(id,localizedFirstName,localizedLastName)',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    // Step 3: Get user email from LinkedIn
    const emailResponse = await axios.get<LinkedInEmailInfo>(
      'https://api.linkedin.com/v2/emailAddresses?q=members&projection=(elements*(handle~))',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    // Step 4: Get profile picture (optional)
    let profilePictureUrl = null;
    try {
      const profileResponse = await axios.get<LinkedInProfilePicture>(
        'https://api.linkedin.com/v2/people/~:(profilePicture(displayImage~:playableStreams))',
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      // if (profileResponse.data.profilePicture?.['displayImage~']?.elements?.length > 0) {
      //   const profileElements = profileResponse.data.profilePicture['displayImage~'].elements;
      //   const largestImage = profileElements[profileElements.length - 1];
      //   if (largestImage.identifiers?.length > 0) {
      //     profilePictureUrl = largestImage.identifiers[0].identifier;
      //   }
      // }
    } catch (profileError) {
      console.warn('Could not fetch LinkedIn profile picture:', profileError);
    }

    const linkedinUser = userResponse.data;
    const userEmail = emailResponse.data.elements?.[0]?.['handle~']?.emailAddress;

    if (!userEmail) {
      return ApiResponse.error(res, 'Unable to retrieve email from LinkedIn');
    }

    // Step 5: Check if user exists with this email
    let user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (user) {
      // User exists, update their LinkedIn info if needed
      if (!user.linkedinId && linkedinUser.id) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            linkedinId: linkedinUser.id,
            profileImage: profilePictureUrl || user.profileImage,
            provider: "linkedin",
          },
        });
      }
    } else {
      // Create new user from LinkedIn OAuth
      user = await prisma.user.create({
        data: {
          FirstName: linkedinUser.localizedFirstName,
          LastName: linkedinUser.localizedLastName,
          email: userEmail,
          linkedinId: linkedinUser.id,
          profileImage: profilePictureUrl,
          provider: "linkedin",
          email_verified_at: new Date(),
          status: 1,
        },
      });

      console.log('✅ New user created via LinkedIn OAuth:', user.email);
    }

    // Generate JWT token and set cookie
    const { token, cookieOptions, expiresIn } = generateTokenAndSetCookie(user, false);
    res.cookie('auth_token', token, cookieOptions);

    return ApiResponse.success(
      res,
      {
        user: {
          id: user.id,
          firstName: user.FirstName,
          lastName: user.LastName,
          email: user.email,
          profileImage: user.profileImage,
        },
        token,
        authenticated: true,
        expiresIn: expiresIn,
        provider: 'linkedin',
      },
      'LinkedIn login successful'
    );

  } catch (error: any) {
    console.error('❌ LinkedIn OAuth error:', error);
    return ApiResponse.error(res, 'LinkedIn authentication failed');
  }
}

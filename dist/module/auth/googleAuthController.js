"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleCallback = googleCallback;
const ApiResponse_1 = require("../../utils/ApiResponse");
const jwtUtils_1 = require("../../utils/jwtUtils");
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const prisma = new client_1.PrismaClient();
async function googleCallback(req, res) {
    try {
        const { code, redirectUri } = req.body;
        if (!code) {
            return ApiResponse_1.ApiResponse.error(res, 'Authorization code is required');
        }
        console.log('🔐 Google OAuth callback received');
        // Step 1: Exchange code for access token
        const tokenResponse = await axios_1.default.post('https://oauth2.googleapis.com/token', {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
        });
        const { access_token } = tokenResponse.data;
        // Step 2: Get user info from Google
        const userResponse = await axios_1.default.get(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`);
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
                        profileImage: googleUser.picture || user.profileImage,
                        provider: "google",
                    },
                });
            }
        }
        else {
            // Create new user from Google OAuth
            const [firstName, ...lastNameParts] = googleUser.name.split(' ');
            const lastName = lastNameParts.join(' ') || '';
            user = await prisma.user.create({
                data: {
                    FirstName: firstName,
                    LastName: lastName,
                    email: googleUser.email,
                    googleId: googleUser.id,
                    // profileImage: googleUser.picture,
                    provider: "google",
                    email_verified_at: new Date(),
                    status: 1,
                },
            });
            console.log('✅ New user created via Google OAuth:', user.email);
        }
        // Generate JWT token and set cookie
        const { token, cookieOptions, expiresIn } = (0, jwtUtils_1.generateTokenAndSetCookie)(user, false);
        res.cookie('auth_token', token, cookieOptions);
        return ApiResponse_1.ApiResponse.success(res, {
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
            provider: 'google',
        }, 'Google login successful');
    }
    catch (error) {
        console.error('❌ Google OAuth error:', error);
        return ApiResponse_1.ApiResponse.error(res, 'Google authentication failed');
    }
}

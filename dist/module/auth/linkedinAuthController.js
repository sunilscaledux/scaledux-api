"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkedinCallback = linkedinCallback;
const ApiResponse_1 = require("../../utils/ApiResponse");
const jwtUtils_1 = require("../../utils/jwtUtils");
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const ulid_1 = require("ulid");
const prisma = new client_1.PrismaClient();
async function linkedinCallback(req, res) {
    try {
        const { code, redirectUri } = req.body;
        if (!code) {
            return ApiResponse_1.ApiResponse.error(res, "Authorization code is required");
        }
        console.log("🔐 LinkedIn OAuth callback received");
        console.log("📋 Request data:", {
            code: code.substring(0, 10) + "...",
            redirectUri,
        });
        // Validate environment variables
        if (!process.env.LINKEDIN_CLIENT_ID ||
            !process.env.LINKEDIN_CLIENT_SECRET) {
            console.error("❌ Missing LinkedIn credentials in environment variables");
            return ApiResponse_1.ApiResponse.error(res, "LinkedIn configuration error");
        }
        // Step 1: Exchange code for access token
        // Use the exact redirect URI that was sent (it must match the one used in authorization)
        console.log("🔧 Using redirect URI exactly as received:", redirectUri);
        const tokenParams = {
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri, // Use exactly what frontend sent
            client_id: process.env.LINKEDIN_CLIENT_ID,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        };
        console.log("🔄 Token exchange params:", {
            ...tokenParams,
            client_secret: "***hidden***",
            code: code.substring(0, 10) + "...",
        });
        let tokenResponse;
        try {
            tokenResponse = await axios_1.default.post("https://www.linkedin.com/oauth/v2/accessToken", new URLSearchParams(tokenParams), {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });
        }
        catch (tokenError) {
            console.error("❌ Token exchange failed!");
            console.error("📋 LinkedIn error response:", tokenError.response?.data);
            console.error("📋 Status:", tokenError.response?.status);
            // Return the actual LinkedIn error message
            const errorMsg = tokenError.response?.data?.error_description ||
                tokenError.response?.data?.error ||
                "Token exchange failed";
            return ApiResponse_1.ApiResponse.error(res, `LinkedIn OAuth Error: ${errorMsg}`);
        }
        console.log("✅ Token exchange successful");
        const { access_token } = tokenResponse.data;
        console.log("🔑 Access token received:", access_token.substring(0, 20) + "...");
        // Step 2: Try OpenID Connect userinfo first, fallback to basic profile
        console.log("🔄 Trying LinkedIn OpenID Connect userinfo...");
        let linkedinUser;
        let userEmail;
        let firstName;
        let lastName;
        try {
            // Try OpenID Connect endpoint first
            const userResponse = await axios_1.default.get("https://api.linkedin.com/v2/userinfo", {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            });
            console.log("✅ OpenID Connect userinfo successful!");
            const userData = userResponse.data;
            linkedinUser = { id: userData.sub };
            userEmail = userData.email;
            firstName = userData.given_name || "";
            lastName = userData.family_name || "";
            console.log("📋 OpenID Connect user data:", {
                sub: userData.sub,
                email: userData.email,
                given_name: userData.given_name,
                family_name: userData.family_name,
            });
        }
        catch (oidcError) {
            console.log("⚠️  OpenID Connect failed, trying basic profile endpoints...");
            // Fallback to basic profile endpoints
            const userResponse = await axios_1.default.get("https://api.linkedin.com/v2/people/~:(id,firstName,lastName,profilePicture(displayImage~:playableStreams))", {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            });
            console.log("✅ User profile fetched successfully");
            // Get user email from LinkedIn
            console.log("🔄 Fetching user email from LinkedIn...");
            const emailResponse = await axios_1.default.get("https://api.linkedin.com/v2/emailAddresses?q=members&projection=(elements*(handle~))", {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            });
            console.log("✅ User email fetched successfully");
            linkedinUser = userResponse.data;
            userEmail =
                emailResponse.data.elements?.[0]?.["handle~"]?.emailAddress || "";
            // Get localized names
            firstName =
                Object.values(linkedinUser.firstName?.localized || {})[0] ||
                    "";
            lastName =
                Object.values(linkedinUser.lastName?.localized || {})[0] ||
                    "";
        }
        console.log("📋 Final LinkedIn user data:", {
            id: linkedinUser.id,
            email: userEmail,
            firstName,
            lastName,
        });
        if (!userEmail) {
            console.error("❌ No email found in LinkedIn response");
            return ApiResponse_1.ApiResponse.error(res, "Unable to retrieve email from LinkedIn. Please ensure email scope is granted.");
        }
        console.log("👤 Processed user info:", {
            firstName,
            lastName,
            email: userEmail,
        });
        // Step 4: Check if user exists with this email
        let user = await prisma.user.findUnique({
            where: { email: userEmail },
        });
        if (user) {
            // User exists, update their LinkedIn info if needed
            if (!user.linkedinId && linkedinUser.id) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        linkedinId: linkedinUser.id,
                        profileImage: linkedinUser.profilePicture?.displayImage || user.profileImage,
                        provider: "linkedin",
                    },
                });
            }
        }
        else {
            // Create new user from LinkedIn OAuth
            user = await prisma.user.create({
                data: {
                    uniqueId: (0, ulid_1.ulid)(),
                    FirstName: firstName,
                    LastName: lastName,
                    email: userEmail,
                    linkedinId: linkedinUser.id,
                    profileImage: linkedinUser.profilePicture?.displayImage,
                    provider: "linkedin",
                    email_verified_at: new Date(),
                    status: 1,
                },
            });
            console.log("✅ New user created via LinkedIn OAuth:", userEmail);
        }
        // Generate JWT token and set cookie
        const { token, cookieOptions, expiresIn } = (0, jwtUtils_1.generateTokenAndSetCookie)(user, false);
        res.cookie("auth_token", token, cookieOptions);
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
            provider: "linkedin",
        }, "LinkedIn login successful");
    }
    catch (error) {
        console.error('❌ LinkedIn OAuth error:', error);
        console.error("❌ Error stack:", error.stack);
        // Log detailed error information
        if (error.response) {
            console.error("📋 Error response:", {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data,
                url: error.response.config?.url,
                method: error.response.config?.method,
            });
        }
        else if (error.request) {
            console.error("📋 Request error (no response):", error.request);
        }
        else {
            console.error("📋 General error:", error.message);
        }
        // Return detailed error message for debugging
        let errorMessage = "LinkedIn authentication failed. ";
        if (error.response?.status === 400) {
            errorMessage += `Bad Request: ${error.response.data?.error_description || "Invalid request parameters"}`;
        }
        else if (error.response?.status === 401) {
            errorMessage += `Unauthorized: ${error.response.data?.error_description || "Invalid credentials"}`;
        }
        else if (error.response?.status === 403) {
            errorMessage += `Forbidden: ${error.response.data?.message || "Insufficient permissions"}`;
        }
        else if (error.response) {
            errorMessage += `HTTP ${error.response.status}: ${error.response.data?.message || error.response.statusText}`;
        }
        else {
            errorMessage += error.message;
        }
        return ApiResponse_1.ApiResponse.error(res, errorMessage);
    }
}

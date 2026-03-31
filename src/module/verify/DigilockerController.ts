import { Request, Response } from "express";
import { ApiResponse } from "@utils/ApiResponse";
import { Log } from "@services/loggerService";
import { prisma } from "@services/prismaService";
import {
  digilockerInitiateSession,
  digilockerGetReference,
  digilockerFetchAadhaar,
} from "@services/idtoaiService";
import crypto from "crypto";

const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

/**
 * POST /verify/digilocker/initiate
 * Starts the DigiLocker OAuth flow — returns auth_url to redirect user.
 */
export async function initiateDigilocker(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, "User not authenticated", 401);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { unique_id: true },
    });

    // state = userId + random token so we can verify on callback
    const stateToken = crypto.randomBytes(16).toString("hex");
    const state = `${userId}:${stateToken}`;

    // Store state token temporarily so we can validate on callback
    await prisma.user.update({
      where: { id: userId },
      data: { digilocker_state: stateToken },
    });

    const redirectUrl = `${FRONTEND_URL}/verify/digilocker/callback`;

    const result = await digilockerInitiateSession(
      redirectUrl,
      state,
      user?.unique_id || String(userId),
    );

    if (!result.success) {
      return ApiResponse.error(res, result.error || "Failed to initiate DigiLocker", 502);
    }

    return ApiResponse.success(res, { authUrl: result.authUrl }, "DigiLocker session initiated");
  } catch (error: any) {
    Log.error("[digilocker] initiate error", { error: error.message });
    return ApiResponse.error(res, "Failed to initiate DigiLocker verification");
  }
}

/**
 * POST /verify/digilocker/complete
 * Frontend sends code + code_verifier after DigiLocker redirect.
 * Backend exchanges for reference, fetches Aadhaar, stores result.
 */
export async function completeDigilocker(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, "User not authenticated", 401);

    const { code, codeVerifier, state } = req.body;
    if (!code || !codeVerifier) {
      return ApiResponse.error(res, "code and codeVerifier are required", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { unique_id: true, digilocker_state: true },
    });

    // Validate state
    if (state) {
      const [, stateToken] = String(state).split(":");
      if (stateToken && user?.digilocker_state && stateToken !== user.digilocker_state) {
        return ApiResponse.error(res, "Invalid state — please restart verification", 400);
      }
    }

    const uid = user?.unique_id || String(userId);

    // Step 1: Exchange code for reference_key
    const refResult = await digilockerGetReference(code, codeVerifier, uid);
    if (!refResult.success || !refResult.referenceKey) {
      return ApiResponse.error(res, refResult.error || "Failed to get DigiLocker reference", 502);
    }

    // Step 2: Fetch Aadhaar data
    const aadhaar = await digilockerFetchAadhaar(refResult.referenceKey, uid);
    if (!aadhaar.success) {
      return ApiResponse.error(res, aadhaar.error || "Failed to fetch Aadhaar data", 502);
    }

    // Clear state token
    await prisma.user.update({
      where: { id: userId },
      data: { digilocker_state: null },
    });

    Log.info(`[digilocker][${uid}] Aadhaar fetched successfully — name: ${aadhaar.name}`);

    return ApiResponse.success(res, {
      name: aadhaar.name,
      dob: aadhaar.dob,
      gender: aadhaar.gender,
      aadhaarUid: aadhaar.aadhaarUid,
      address: aadhaar.address,
      image: aadhaar.image,
      _raw: aadhaar.raw, // temporary: for debugging response structure
    }, "Aadhaar data retrieved successfully");
  } catch (error: any) {
    Log.error("[digilocker] complete error", { error: error.message });
    return ApiResponse.error(res, "Failed to complete DigiLocker verification");
  }
}

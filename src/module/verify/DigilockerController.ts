import { Request, Response } from "express";
import { ApiResponse } from "@utils/ApiResponse";
import { Log } from "@services/loggerService";
import { prisma } from "@services/prismaService";
import {
  digilockerInitiateSession,
  digilockerGetReference,
  digilockerFetchAadhaar,
  digilockerFetchDrivingLicence,
} from "@services/idtoaiService";
import { updateCompletionSection } from "../profile/ProfileCompletionService";
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

    const redirectUrl = `${FRONTEND_URL}/callback/digilocker`;

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
 * Backend exchanges for reference, fetches Aadhaar, stores verification_type + status + meta_data.
 */
export async function completeDigilocker(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, "User not authenticated", 401);

    const { code, codeVerifier, state, docType } = req.body;
    if (!code || !codeVerifier) {
      return ApiResponse.error(res, "code and codeVerifier are required", 400);
    }

    // docType: "aadhaar" (default) or "driving_licence"
    const documentType = docType === "driving_licence" ? "driving_licence" : "aadhaar";

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

    // Clear state token
    await prisma.user.update({
      where: { id: userId },
      data: { digilocker_state: null },
    });

    // Step 2: Fetch the requested document
    if (documentType === "driving_licence") {
      const dlResult = await digilockerFetchDrivingLicence(refResult.referenceKey, uid);
      if (!dlResult.success) {
        return ApiResponse.error(res, dlResult.error || "Failed to fetch Driving Licence", 502);
      }

      const metaData = {
        name: dlResult.name,
        dob: dlResult.dob,
        dlNumber: dlResult.dlNumber,
        issueDate: dlResult.issueDate,
        expiryDate: dlResult.expiryDate,
        vehicleClasses: dlResult.vehicleClasses,
        address: dlResult.address,
        image: dlResult.image,
        verifiedVia: "digilocker",
        verifiedAt: new Date().toISOString(),
      };

      const existing = await prisma.identityVerification.findFirst({
        where: { user_id: userId, verification_type: "driving_licence" },
      });

      const verificationData = {
        user_id: userId,
        verification_type: "driving_licence",
        status: "APPROVED",
        meta_data: metaData as any,
        submitted_at: new Date(),
        verified_at: new Date(),
      };

      if (existing) {
        await prisma.identityVerification.update({
          where: { id: existing.id },
          data: verificationData,
        });
      } else {
        await prisma.identityVerification.create({ data: verificationData });
      }

      Log.info(`[digilocker][${uid}] DL verified & saved — dlNumber: ${dlResult.dlNumber}`);

      return ApiResponse.success(res, {
        name: dlResult.name,
        dob: dlResult.dob,
        dlNumber: dlResult.dlNumber,
        issueDate: dlResult.issueDate,
        expiryDate: dlResult.expiryDate,
        vehicleClasses: dlResult.vehicleClasses,
        address: dlResult.address,
        image: dlResult.image,
        status: "APPROVED",
        verificationType: "driving_licence",
      }, "Driving Licence verified successfully via DigiLocker");
    }

    // Default: Aadhaar
    const aadhaar = await digilockerFetchAadhaar(refResult.referenceKey, uid);
    if (!aadhaar.success) {
      return ApiResponse.error(res, aadhaar.error || "Failed to fetch Aadhaar data", 502);
    }

    const metaData = {
      name: aadhaar.name,
      dob: aadhaar.dob,
      gender: aadhaar.gender,
      aadhaarUid: aadhaar.aadhaarUid,
      address: aadhaar.address,
      image: aadhaar.image,
      verifiedVia: "digilocker",
      verifiedAt: new Date().toISOString(),
    };

    const existingVerification = await prisma.identityVerification.findFirst({
      where: { user_id: userId, verification_type: "aadhaar" },
    });

    const verificationData = {
      user_id: userId,
      verification_type: "aadhaar",
      status: "APPROVED",
      meta_data: metaData as any,
      submitted_at: new Date(),
      verified_at: new Date(),
    };

    if (existingVerification) {
      await prisma.identityVerification.update({
        where: { id: existingVerification.id },
        data: verificationData,
      });
    } else {
      await prisma.identityVerification.create({ data: verificationData });
    }

    // Update user identity status to APPROVED
    await prisma.user.update({
      where: { id: userId },
      data: {
        identity_verification_status: "APPROVED",
        identity_verified_at: new Date(),
      },
    });
    await updateCompletionSection(userId, "identityVerification", true);

    Log.info(`[digilocker][${uid}] Aadhaar verified & saved — name: ${aadhaar.name}`);

    return ApiResponse.success(res, {
      name: aadhaar.name,
      dob: aadhaar.dob,
      gender: aadhaar.gender,
      aadhaarUid: aadhaar.aadhaarUid,
      address: aadhaar.address,
      image: aadhaar.image,
      status: "APPROVED",
      verificationType: "aadhaar",
    }, "Identity verified successfully via DigiLocker");
  } catch (error: any) {
    Log.error("[digilocker] complete error", { error: error.message });
    return ApiResponse.error(res, "Failed to complete DigiLocker verification");
  }
}

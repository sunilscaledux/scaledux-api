import { prisma } from "@config/prisma";
import bcrypt from "bcrypt";
import {
  LoginInput,
  RegisterInput,
  TempUserInput,
  UserDetail,
} from "./userTypes";
import { generateJwtToken } from "@utils/jwtUtils";

export async function checkUserExists(input: string): Promise<boolean> {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        {
          phone: input,
        },
        {
          email: input,
        },
      ],
    },
  });

  return !!existingUser;
}

export async function checkTempUserExists(input: string): Promise<boolean> {
  const existingTempUser = await prisma.tempUser.findFirst({
    where: {
      OR: [
        {
          phone: input,
        },
        {
          email: input,
        },
      ],
    },
  });

  return !!existingTempUser;
}

export async function createTempUser(data: TempUserInput): Promise<any> {
  const input = normalizeContact(data.email);
  await deleteTempUser(data.email);
  return await prisma.tempUser.create({
    data: { ...data, ...input },
  });
}

export async function getTempUser(input: string): Promise<any | null> {
  const tempUser = await prisma.tempUser.findFirst({
    where: {
      OR: [{ email: input }, { phone: input }],
    },
  });

  if (!tempUser) return null;

  return tempUser;
}

export async function deleteTempUser(input: string): Promise<void> {
  await prisma.user.deleteMany({
    where: {
      OR: [
        {
          phone: input,
        },
        {
          email: input,
        },
      ],
    },
  });
  return;
}

export async function createUserAfterOtpVerification(
  data: RegisterInput
): Promise<UserDetail> {
  // Double-check user doesn't exist
  const userExists = await checkUserExists(data.email);
  if (userExists) throw new Error("User already exists");
  const verificationData: any = {
    ...data,
  };

  // Set verification timestamp for the method that was used
  if (data.email) {
    verificationData.email_verified_at = new Date();
  }
  // if (data.phone) {
  //   verificationData.phone_verified_at = new Date();
  // }

  const user = await prisma.user.create({
    data: verificationData,
  });

  const { password, ...safeUser } = user;
  return safeUser;
}

export async function userLogin(data: LoginInput): Promise<{
  success: boolean;
  message: string;
  user?: UserDetail;
  token?: string;
}> {
  try {
    // Build conditions for finding user
    const conditions = [];
    if (data.email && data.email.trim() !== "") {
      conditions.push({ email: data.email });
    }
    if (data.phone && data.phone.trim() !== "") {
      conditions.push({ phone: data.phone });
    }

    if (conditions.length === 0) {
      return {
        success: false,
        message: "Email or phone number is required",
      };
    }

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: { OR: conditions },
    });
    if (!user) {
      return {
        success: false,
        message: "Invalid credentials",
      };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      return {
        success: false,
        message: "Invalid credentials",
      };
    }

    // Check if email/phone is verified (if provided)
    if (data.email && !user.email_verified_at) {
      return {
        success: false,
        message: "Please verify your email before logging in",
      };
    }

    if (data.phone && !user.phone_verified_at) {
      return {
        success: false,
        message: "Please verify your phone number before logging in",
      };
    }

    // Generate JWT token
    const token = generateJwtToken(user);

    // Return safe user data (without password)
    const { password: _, ...safeUser } = user;

    return {
      success: true,
      message: "Login successful",
      user: safeUser,
      token,
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      message: "Login failed. Please try again.",
    };
  }
}

export function normalizeContact(email: string) {
  const incoming = email;

  if (!incoming) {
    return { email: null, phone: null };
  }

  const isEmail = /@/.test(incoming);
  const digitsOnly = incoming.replace(/\D/g, "");
  const isPhone = /^\d{7,15}$/.test(digitsOnly);

  if (isEmail) {
    return { email: incoming, phone: null };
  } else if (isPhone) {
    return { email: null, phone: digitsOnly };
  } else {
    // Keep as-is and let Joi raise validation error
    return { email: incoming, phone: null };
  }
}


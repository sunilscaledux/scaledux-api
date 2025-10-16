import { prisma } from "@config/prisma";
import bcrypt from "bcrypt";
import { LoginInput, RegisterInput, UserDetail } from "./AuthTypes";
import { ServiceResponse } from "@utils/ApiResponse";
import { ulid } from "ulid";

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

export async function createUserAfterOtpVerification(
  data: RegisterInput
): Promise<ServiceResponse> {
  try {
    // Double-check user doesn't exist
    const userExists = await checkUserExists(data.email);
    if (userExists) {
      return {
        success: false,
        message: "User already exists"
      };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const contactInfo = normalizeContact(data.email);

    const userData: any = {
      FirstName: data.FirstName,
      uniqueId: ulid(),
      LastName: data.LastName,
      email: contactInfo.email || data.email,
      phone: contactInfo.phone,
      password: hashedPassword,
      terms: data.terms,
      notification: data.notification || false,
      status: 1,
    };

    // Set verification timestamp for the method that was used
    if (contactInfo.email || data.email) {
      userData.email_verified_at = new Date();
    }
    if (contactInfo.phone) {
      userData.phone_verified_at = new Date();
    }

    const user = await prisma.user.create({
      data: userData,
    });

    const { password, ...safeUser } = user;
    return {
      success: true,
      message: "User created successfully",
      data: safeUser
    };
  } catch (error) {
    console.error("Create user error:", error);
    return {
      success: false,
      message: "Failed to create user. Please try again."
    };
  }
}

export async function userLogin(data: LoginInput): Promise<ServiceResponse> {
  try {
    const contactInfo = normalizeContact(data.email || "");

    const conditions = [];
    if (contactInfo.email) {
      conditions.push({ email: contactInfo.email });
    }
    if (contactInfo.phone) {
      conditions.push({ phone: contactInfo.phone });
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
    const isPasswordValid = await bcrypt.compare(
      data.password,
      user.password || ""
    );
    if (!isPasswordValid) {
      return {
        success: false,
        message: "Invalid credentials",
      };
    }

    // Check if the contact method used for login is verified
    if (contactInfo.email && !user.email_verified_at) {
      return {
        success: false,
        message: "Please verify your email before logging in",
      };
    }

    if (contactInfo.phone && !user.phone_verified_at) {
      return {
        success: false,
        message: "Please verify your phone number before logging in",
      };
    }

    // Return safe user data (without password)
    const { password: _, ...safeUser } = user;

    return {
      success: true,
      message: "Login successful",
      data: safeUser,
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      message: "Login failed. Please try again.",
    };
  }
}

export async function userOtpLogin(
  identifier: string
): Promise<ServiceResponse> {
  try {
    const contactInfo = normalizeContact(identifier);

    // Build conditions for finding user
    const conditions = [];
    if (contactInfo.email) {
      conditions.push({ email: contactInfo.email });
    }
    if (contactInfo.phone) {
      conditions.push({ phone: contactInfo.phone });
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
        message: "User not found",
      };
    }

    // Check if the contact method used for login is verified
    if (contactInfo.email && !user.email_verified_at) {
      return {
        success: false,
        message: "Please verify your email before logging in",
      };
    }

    if (contactInfo.phone && !user.phone_verified_at) {
      return {
        success: false,
        message: "Please verify your phone number before logging in",
      };
    }

    // Return safe user data (without password)
    const { password: _, ...safeUser } = user;

    return {
      success: true,
      message: "OTP login successful",
      data: safeUser,
    };
  } catch (error) {
    console.error("OTP Login error:", error);
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


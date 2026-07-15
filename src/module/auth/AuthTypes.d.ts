export interface RegisterInput {
  first_name: string;
  last_name?: string;
  /** Email or phone. */
  identifier: string;
  password: string;
  terms: boolean;
  notification?: boolean;
}

export interface LoginInput {
  /** Email or phone. */
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface UserDetail {
  id: number;
  FirstName: string;
  LastName?: string | null;
  email?: string | null;
  phone?: string | null;
  email_verified_at?: Date | null;
  phone_verified_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface UnifiedOtpRequest {
  identifier: string;
  type: "registration" | "login" | "forgot";
}

export interface VerifyOtpInput {
  identifier: string; // Can be email or phone
  otp: string;
}

export interface ResendOtpInput {
  identifier: string; // Can be email or phone
}

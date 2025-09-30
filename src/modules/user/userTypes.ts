export interface RegisterInput {
  FirstName: string;
  LastName: string;
  email: string;
  password: string;
  terms: boolean;
  notification?: boolean;
}

export interface LoginInput {
  email?: string;
  phone?: string;
  password: string;
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

export interface VerifyOtpInput {
  identifier: string; // Can be email or phone
  otp: string;
}

export interface ResendOtpInput {
  identifier: string; // Can be email or phone
}

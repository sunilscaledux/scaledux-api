export interface RegisterInput {
  FirstName: string;
  LastName?: string;
  email: string;
  phone?: string;
  password: string;
}

export interface LoginInput {
  email?: string;
  phone?: string;
  password: string;
}

export interface UserDetail {
  id: number;
  FirstName: string;
  LastName?: string|null;
  email: string;
  phone?: string|null;
  email_verified_at?: Date | null;
  phone_verified_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}
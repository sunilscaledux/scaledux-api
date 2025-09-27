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
  f_name: string;
  l_name?: string;
  email: string;
  phone?: string;
  email_verified_at?: Date | null;
  phone_verified_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}
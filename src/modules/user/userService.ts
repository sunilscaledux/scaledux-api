import { prisma } from '../../config/prisma';
import bcrypt from 'bcrypt';
import { RegisterInput, UserDetail } from './userTypes';

export async function checkUserExists(email?: string | null, phone?: string | null): Promise<boolean> {
  // Build conditions array, only including non-null/undefined/empty values
  const conditions = [];
  
  if (email && email.trim() !== '') {
    conditions.push({ email });
  }
  
  if (phone && phone.trim() !== '') {
    conditions.push({ phone });
  }
  
  // If no valid conditions, return false
  if (conditions.length === 0) {
    return false;
  }
  
  const existingUser = await prisma.user.findFirst({
    where: { OR: conditions }
  });
  
  return !!existingUser;
}

export async function checkTempUserExists(email?: string | null, phone?: string | null): Promise<boolean> {
  // Build conditions array, only including non-null/undefined/empty values
  const conditions = [];
  
  if (email && email.trim() !== '') {
    conditions.push({ email });
  }
  
  if (phone && phone.trim() !== '') {
    conditions.push({ phone });
  }
  
  // If no valid conditions, return false
  if (conditions.length === 0) {
    return false;
  }
  
  const existingTempUser = await prisma.tempUser.findFirst({
    where: { OR: conditions }
  });
  
  return !!existingTempUser;
}

export async function createTempUser(data: RegisterInput): Promise<any> {
  // Delete existing temp user with same email/phone
  await deleteTempUser(data)

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const tempUser = await prisma.tempUser.create({
    data: { ...data, password: hashedPassword }
  });

  const { password, ...safeTempUser } = tempUser;
  return safeTempUser;
}

export async function getTempUserByEmailOrPhone(emailOrPhone: string): Promise<RegisterInput | null> {
  if (!emailOrPhone) return null;
  
  const tempUser = await prisma.tempUser.findFirst({
    where: {
      OR: [
        { email: emailOrPhone },
        { phone: emailOrPhone }
      ].filter(condition => {
        const value = Object.values(condition)[0];
        return value && value.trim() !== '';
      })
    }
  });

  if (!tempUser) return null;

  return {
    FirstName: tempUser.FirstName,
    LastName: tempUser.LastName || null,
    email: tempUser.email || null,
    phone: tempUser.phone || null,
    password: tempUser.password
  };
}

export async function deleteTempUser(data: RegisterInput | string): Promise<void> {
  const conditions = [];
  
  if (typeof data === 'string') {
    // If data is a string, treat it as email or phone
    if (data && data.trim() !== '') {
      conditions.push({ email: data }, { phone: data });
    }
  } else {
    // If data is RegisterInput object
    if (data.email && data.email.trim() !== '') {
      conditions.push({ email: data.email });
    }
    if (data.phone && data.phone.trim() !== '') {
      conditions.push({ phone: data.phone });
    }
  }
  
  // Only delete if we have valid conditions
  if (conditions.length > 0) {
    await prisma.tempUser.deleteMany({
      where: { OR: conditions }
    });
  }
}

export async function createUserAfterOtpVerification(data: RegisterInput): Promise<UserDetail> {
  // Double-check user doesn't exist
  const userExists = await checkUserExists(data.email, data.phone);
  if (userExists) throw new Error('User already exists');

  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Determine verification timestamps based on what was verified
  const verificationData: any = {
    ...data,
    password: hashedPassword
  };

  // Set verification timestamp for the method that was used
  if (data.email) {
    verificationData.email_verified_at = new Date();
  }
  if (data.phone) {
    verificationData.phone_verified_at = new Date();
  }

  const user = await prisma.user.create({
    data: verificationData
  });

  const { password, ...safeUser } = user;
  return safeUser;
}

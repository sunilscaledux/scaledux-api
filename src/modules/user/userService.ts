import { prisma } from '../../config/prisma';
import bcrypt from 'bcrypt';
import { RegisterInput, UserDetail } from './userTypes';

export async function checkUserExists(email?: string, phone?: string): Promise<boolean> {
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email:email }, { phone: phone || undefined }] }
  });
  return !!existingUser;
}

export async function checkTempUserExists(email?: string, phone?: string): Promise<boolean> {
  const existingTempUser = await prisma.tempUser.findFirst({
    where: { OR: [{ email }, { phone: phone || undefined }] }
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

export async function getTempUserByEmail(email: string): Promise<RegisterInput | null> {
  const tempUser = await prisma.tempUser.findUnique({
    where: { email }
  });

  if (!tempUser) return null;

  return {
    FirstName: tempUser.FirstName,
    LastName: tempUser.LastName,
    email: tempUser.email,
    phone: tempUser.phone,
    password: tempUser.password
  };
}

export async function deleteTempUser(data:RegisterInput): Promise<void> {
  await prisma.tempUser.deleteMany({
    where: { 
      OR:[
        {
          email:data.email,
          phone:data.phone
        }
      ]
     }
  });
}

export async function createUserAfterOtpVerification(data: RegisterInput): Promise<UserDetail> {
  // Double-check user doesn't exist
  const userExists = await checkUserExists(data.email, data.phone);
  if (userExists) throw new Error('User already exists');

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: { 
      ...data, 
      password: hashedPassword,
      email_verified_at: new Date() // Mark as verified since OTP was verified
    }
  });

  const { password, ...safeUser } = user;
  return safeUser;
}

import { prisma } from '../../config/prisma';
import bcrypt from 'bcrypt';
import { RegisterInput, UserDetail } from './userTypes';

export async function checkUserExists(email?: string, phone?: string): Promise<boolean> {
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone: phone || undefined }] }
  });
  return existingUser|{};
}

export async function createTempUser(data: RegisterInput): Promise<UserDetail> {
  

  //delete temp user
   await prisma.tempUser.deleteMany({
    where:{
      OR:[
       { 
        email:data.email,
        phone:data.phone
       }
      ]
    }
  });
  

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.tempUser.create({
    data: { ...data, password: hashedPassword }
  });

  const { password, ...safeUser } = user;
  return safeUser;
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

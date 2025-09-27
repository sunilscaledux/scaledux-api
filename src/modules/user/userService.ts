import { prisma } from '../../config/prisma';
import bcrypt from 'bcrypt';
import { RegisterInput, UserDetail } from './userTypes';

export async function registerUser(data: RegisterInput): Promise<UserDetail> {
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { phone: data.phone || undefined }] }
  });
  if (existingUser) throw new Error('Email or phone already exists');

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: { ...data, password: hashedPassword }
  });

  const { password, ...safeUser } = user;
  return safeUser;
}

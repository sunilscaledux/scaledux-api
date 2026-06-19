import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const name = process.env.SEED_ADMIN_NAME || 'Super Admin';
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@scaledux.com').toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe@12345';

  const hashed = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { name, role: 'SUPER_ADMIN', status: 1 },
    create: { name, email, password: hashed, role: 'SUPER_ADMIN', status: 1 },
  });

  console.log('✔ Seeded super-admin:');
  console.log('   email:   ', admin.email);
  console.log('   password:', password, '(change this after first login)');
  console.log('   role:    ', admin.role);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

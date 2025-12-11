import { PrismaClient } from '@prisma/client'
import { seedCurrencies } from "./seeds/currencies-seed";
import { seedCountriesAndStates } from "./seeds/countries-states-seed";
import { seedLanguages } from "./seeds/languages-seed";
import { seedExpertise } from "./seeds/expertise-seed";
import { seedServiceCategories } from "./seeds/service-categories-seed";
import { seedIndustries } from "./seeds/industries-seed";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting comprehensive database seeding...");

  // // 1. Seed Currencies
  const currencyMap = await seedCurrencies(prisma);

  // // 2. Seed Countries and States
  await seedCountriesAndStates(prisma, currencyMap);

  // // 3. Seed Languages
  await seedLanguages(prisma);

  // // 4. Seed Expertise System
  await seedExpertise(prisma);

  // 5. Seed Service Categories
  await seedServiceCategories(prisma);

  // 6. Seed Industries
  await seedIndustries(prisma);

  console.log("✅ All seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import { PrismaClient } from '@prisma/client'
import { seedCurrencies } from "./seeds/currencies-seed";
import { seedCountriesAndStates } from "./seeds/countries-states-seed";
import { seedLanguages } from "./seeds/languages-seed";
import { seedExpertise } from "./seeds/expertise-seed";
import { seedIndustries } from "./seeds/industries-seed";
import { seedSubIndustriesAndBusinessModels } from "./seeds/sub-industries-business-models-seed";
import { seedStartupPhases } from "./seeds/startup-phases-seed";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting comprehensive database seeding...");

  // // 1. Seed Currencies
  const currencyMap = await seedCurrencies(prisma);

  // 2. Seed Countries and States
  await seedCountriesAndStates(prisma, currencyMap);

  // 3. Seed Languages
  await seedLanguages(prisma);

  // 4. Seed Expertise System
  await seedExpertise(prisma);

  // 5. Seed Industries
  await seedIndustries(prisma);

  // // 6. Seed Sub-Industries and Business Models
  await seedSubIndustriesAndBusinessModels(prisma);

  // // 7. Seed Revenue Models — skipped (not needed yet)
  // await seedRevenueModels(prisma);

  // Billing seed removed — billing data is created by actual payment flow

  // 8. Seed Startup Phases (Phase 0 to Phase 7)
  await seedStartupPhases(prisma);

  console.log("All seeding completed successfully!");
  console.log("Run 'npm run cache' to warm Redis caches.");
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

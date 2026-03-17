import { PrismaClient } from '@prisma/client'
import { seedCurrencies } from "./seeds/currencies-seed";
import { seedCountriesAndStates } from "./seeds/countries-states-seed";
import { seedLanguages } from "./seeds/languages-seed";
import { seedExpertise } from "./seeds/expertise-seed";
import { seedIndustries } from "./seeds/industries-seed";
import { seedSubIndustriesAndBusinessModels } from "./seeds/sub-industries-business-models-seed";
import { seedTeamRoles } from "./seeds/team-roles-seed";
import { seedRevenueModels } from "./seeds/revenue-models-seed";
import { seedBillingData } from "./seeds/billing-seed";

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

  // 5. Seed Industries
  await seedIndustries(prisma);

  // 6. Seed Sub-Industries and Business Models
  await seedSubIndustriesAndBusinessModels(prisma);

  // 7. Seed Team Roles
  await seedTeamRoles(prisma);

  // 8. Seed Revenue Models
  await seedRevenueModels(prisma);

  // await seedBillingData(prisma);

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

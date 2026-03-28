import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { seedCurrencies } from "./seeds/currencies-seed";
import { seedCountriesAndStates } from "./seeds/countries-states-seed";
import { seedLanguages } from "./seeds/languages-seed";
import { seedExpertise } from "./seeds/expertise-seed";
import { seedIndustries } from "./seeds/industries-seed";
import { seedSubIndustriesAndBusinessModels } from "./seeds/sub-industries-business-models-seed";
import { seedRevenueModels } from "./seeds/revenue-models-seed";
import { seedBillingData } from "./seeds/billing-seed";

const prisma = new PrismaClient();

/**
 * Clear all Redis config/reference-data caches so the API serves fresh data after seeding.
 */
async function clearRedisConfigCaches() {
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379');
  const redisPassword = process.env.REDIS_PASSWORD || undefined;
  const redisDb = parseInt(process.env.REDIS_DB || '0');

  let redis: Redis | null = null;
  try {
    redis = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      db: redisDb,
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null, // Don't retry on failure
      connectTimeout: 5000,
      enableOfflineQueue: false,
    });
    // Suppress unhandled error events (we catch them below)
    redis.on('error', () => {});
    await redis.connect();

    // Flush all keys in the current Redis DB to ensure no stale config data
    await redis.flushdb();
    console.log('Flushed Redis DB — all config caches cleared');
    await redis.quit();
  } catch (error: any) {
    console.warn(`Redis cache clear skipped: ${error.message}`);
    if (redis) {
      try { redis.disconnect(); } catch { /* ignore */ }
    }
  }
}

async function main() {
  console.log("Starting comprehensive database seeding...");

  // // 1. Seed Currencies
  // const currencyMap = await seedCurrencies(prisma);

  // // 2. Seed Countries and States
  // await seedCountriesAndStates(prisma, currencyMap);

  // // 3. Seed Languages
  // await seedLanguages(prisma);

  // // 4. Seed Expertise System
  // await seedExpertise(prisma);

  // 5. Seed Industries
  await seedIndustries(prisma);

  // // 6. Seed Sub-Industries and Business Models
  await seedSubIndustriesAndBusinessModels(prisma);

  // // 7. Seed Revenue Models
  // await seedRevenueModels(prisma);

  // await seedBillingData(prisma);

  // 8. Clear Redis config caches so API serves fresh seeded data
  await clearRedisConfigCaches();

  console.log("All seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

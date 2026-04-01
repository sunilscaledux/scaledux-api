import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

const CDN_HOST = (process.env.BUNNY_CDN_HOSTNAME || '').replace(/\/$/, '')

function getPublicUrl(path: string): string {
  const p = path.replace(/\\/g, '/').replace(/^\/+/, '')
  return CDN_HOST ? `${CDN_HOST}/${p}` : p
}

const prisma = new PrismaClient()

const CACHE_TTL = 864000 // 10 days in seconds

function createRedis(): Redis {
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
  })
}

async function clearAllCaches(redis: Redis) {
  console.log('\n--- Clearing all reference-data caches ---')

  const patterns = [
    'countries:*',
    'states:*',
    'currencies:*',
    'languages:*',
    'expertise:*',
    'specialties:*',
    'skills:*',
    'industries',
    'sub-industries:*',
    'business-models',
  ]

  let totalDeleted = 0

  for (const pattern of patterns) {
    // For exact keys (no wildcard), delete directly
    if (!pattern.includes('*')) {
      const deleted = await redis.del(pattern)
      totalDeleted += deleted
      continue
    }
    // For wildcard patterns, scan and delete
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
      totalDeleted += keys.length
    }
  }

  console.log(`Cleared ${totalDeleted} cache keys`)
}

function mapFlags<T extends { flag?: string | null }>(items: T[]) {
  return items.map(item => ({
    ...item,
    flag: item.flag ? getPublicUrl(item.flag) : null,
  }))
}

async function warmCountries(redis: Redis) {
  const raw = await prisma.country.findMany({
    select: { id: true, name: true, code: true, phone_code: true, flag: true },
    orderBy: { name: 'asc' },
  })
  const countries = mapFlags(raw)
  await redis.setex('countries:all', CACHE_TTL, JSON.stringify(countries))
  console.log(`  countries:all — ${countries.length} entries`)
  return raw // return raw for state lookups (need id)
}

async function warmCountriesWithStates(redis: Redis) {
  const raw = await prisma.country.findMany({
    select: {
      id: true, name: true, code: true, phone_code: true, flag: true,
      states: { select: { id: true, name: true, code: true }, orderBy: { name: 'asc' } },
    },
    orderBy: { name: 'asc' },
  })
  const data = mapFlags(raw)
  await redis.setex('countries:with-states:all', CACHE_TTL, JSON.stringify(data))
  console.log(`  countries:with-states:all — ${data.length} entries`)
}

async function warmStatesByCountry(redis: Redis, countries: { id: number }[]) {
  let total = 0
  for (const country of countries) {
    const states = await prisma.state.findMany({
      where: { country_id: country.id },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    })
    if (states.length > 0) {
      await redis.setex(`states:country:${country.id}`, CACHE_TTL, JSON.stringify(states))
      total += states.length
    }
  }
  console.log(`  states:country:* — ${total} states across ${countries.length} countries`)
}

async function warmCurrencies(redis: Redis) {
  const currencies = await prisma.currency.findMany({
    select: { id: true, name: true, code: true, symbol: true },
    orderBy: { name: 'asc' },
  })
  await redis.setex('currencies:all', CACHE_TTL, JSON.stringify(currencies))
  console.log(`  currencies:all — ${currencies.length} entries`)
}

async function warmCountriesWithCurrencies(redis: Redis) {
  const raw = await prisma.country.findMany({
    select: {
      id: true, name: true, code: true, flag: true,
      currency: { select: { id: true, name: true, code: true, symbol: true } },
    },
    orderBy: { name: 'asc' },
  })
  const data = mapFlags(raw)
  await redis.setex('countries:with-currencies:all', CACHE_TTL, JSON.stringify(data))
  console.log(`  countries:with-currencies:all — ${data.length} entries`)
}

async function warmLanguages(redis: Redis) {
  const languages = await prisma.language.findMany({
    where: { is_active: true },
    select: { id: true, name: true, native_name: true, code: true, country_code: true },
    orderBy: { name: 'asc' },
  })
  await redis.setex('languages:all', CACHE_TTL, JSON.stringify(languages))
  console.log(`  languages:all — ${languages.length} entries`)
}

async function warmExpertiseCategories(redis: Redis) {
  const categories = await prisma.category.findMany({
    where: { is_active: true },
    orderBy: { name: 'asc' },
  })
  await redis.setex('expertise:categories:all', CACHE_TTL, JSON.stringify(categories))
  console.log(`  expertise:categories:all — ${categories.length} entries`)
  return categories
}

async function warmSpecialties(redis: Redis, categories: { id: number }[]) {
  let total = 0
  for (const cat of categories) {
    const specialties = await prisma.subcategory.findMany({
      where: { categoryId: cat.id, is_active: true },
      orderBy: { name: 'asc' },
    })
    if (specialties.length > 0) {
      await redis.setex(`specialties:category:${cat.id}`, CACHE_TTL, JSON.stringify(specialties))
      total += specialties.length
    }
  }
  console.log(`  specialties:category:* — ${total} specialties across ${categories.length} categories`)
}

async function warmSkills(redis: Redis, categories: { id: number }[]) {
  let total = 0
  for (const cat of categories) {
    const skills = await prisma.skill.findMany({
      where: { categoryId: cat.id, is_active: true },
      orderBy: { name: 'asc' },
    })
    if (skills.length > 0) {
      await redis.setex(`skills:category:${cat.id}`, CACHE_TTL, JSON.stringify(skills))
      total += skills.length
    }
  }
  console.log(`  skills:category:* — ${total} skills across ${categories.length} categories`)
}

async function warmIndustries(redis: Redis) {
  const industries = await prisma.industry.findMany({
    where: { is_active: true },
    select: { id: true, name: true, description: true },
    orderBy: { name: 'asc' },
  })
  await redis.setex('industries', CACHE_TTL, JSON.stringify(industries))
  console.log(`  industries — ${industries.length} entries`)
  return industries
}

async function warmSubIndustries(redis: Redis, industries: { id: number }[]) {
  let total = 0
  for (const ind of industries) {
    const subs = await prisma.subIndustry.findMany({
      where: { industry_id: ind.id, is_active: true },
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    })
    if (subs.length > 0) {
      await redis.setex(`sub-industries:industry:${ind.id}`, CACHE_TTL, JSON.stringify(subs))
      total += subs.length
    }
  }
  console.log(`  sub-industries:industry:* — ${total} sub-industries across ${industries.length} industries`)
}

async function warmBusinessModels(redis: Redis) {
  const models = await prisma.businessModel.findMany({
    where: { is_active: true },
    select: { id: true, name: true, code: true, description: true },
    orderBy: { name: 'asc' },
  })
  await redis.setex('business-models', CACHE_TTL, JSON.stringify(models))
  console.log(`  business-models — ${models.length} entries`)
}

async function main() {
  const redis = createRedis()
  await redis.connect()
  console.log('Connected to Redis')

  // Step 1: Clear all existing caches
  await clearAllCaches(redis)

  // Step 2: Warm all caches from DB
  console.log('\n--- Warming all reference-data caches ---')

  // Warm independent caches in parallel
  const [countries, , , , , categories, industries] = await Promise.all([
    warmCountries(redis),
    warmCountriesWithStates(redis),
    warmCurrencies(redis),
    warmCountriesWithCurrencies(redis),
    warmLanguages(redis),
    warmExpertiseCategories(redis),
    warmIndustries(redis),
    warmBusinessModels(redis),
  ])

  // Warm child caches that depend on parent data
  await Promise.all([
    warmStatesByCountry(redis, countries),
    warmSpecialties(redis, categories),
    warmSkills(redis, categories),
    warmSubIndustries(redis, industries),
  ])

  console.log('\nAll caches warmed successfully!')
  await redis.quit()
}

main()
  .catch((e) => {
    console.error('Cache warming failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import { Prisma, PrismaClient } from '@prisma/client'
import { EXPERTISE_TAXONOMY_BUNDLES } from '../data/taxonomy'

const CHUNK = 400

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * Safely clear taxonomy rows that are NOT referenced by user data.
 * Rows referenced by scd_user_expertises, scd_founder_projects, etc. are preserved.
 */
export async function clearExpertiseTaxonomy(prisma: PrismaClient) {
  console.log('🗑️  Clearing unreferenced taxonomy data (skills, specialties, categories)...')

  // Delete skills not referenced by any user data
  const skills = await prisma.$executeRawUnsafe(
    `DELETE FROM "scd_skills" WHERE "id" NOT IN (SELECT DISTINCT UNNEST("skill_ids") FROM "scd_user_expertises" WHERE "skill_ids" IS NOT NULL AND array_length("skill_ids", 1) > 0)`
  ).catch(() => prisma.$executeRawUnsafe(`DELETE FROM "scd_skills"`).catch(() => 0))

  // Delete specialties not referenced by any user data
  const subs = await prisma.$executeRawUnsafe(
    `DELETE FROM "scd_specialties" WHERE "id" NOT IN (SELECT DISTINCT "specialty_id" FROM "scd_user_expertises" WHERE "specialty_id" IS NOT NULL)`
  ).catch(() => prisma.$executeRawUnsafe(`DELETE FROM "scd_specialties"`).catch(() => 0))

  // Delete categories not referenced by any user data
  const cats = await prisma.$executeRawUnsafe(
    `DELETE FROM "scd_expertise_categories" WHERE "id" NOT IN (SELECT DISTINCT "expertise_category_id" FROM "scd_user_expertises" WHERE "expertise_category_id" IS NOT NULL)`
  ).catch(() => 0)

  console.log(
    `   Taxonomy tables cleared (skills/specialties/categories affected rows: ${skills}/${subs}/${cats})`
  )
}

export async function seedExpertise(prisma: PrismaClient) {
  await clearExpertiseTaxonomy(prisma)

  console.log('🎯 Seeding expertise taxonomy from prisma/data/taxonomy...')

  let totalSubs = 0
  let totalSkills = 0

  for (const bundle of EXPERTISE_TAXONOMY_BUNDLES) {
    // Upsert category — reuse existing if name matches
    const existing = await prisma.$queryRaw<{ id: number }[]>`
      SELECT "id" FROM "scd_expertise_categories" WHERE "name" = ${bundle.categoryName} LIMIT 1
    `
    let categoryId: number

    if (existing.length > 0) {
      categoryId = existing[0].id
      await prisma.$executeRaw`
        UPDATE "scd_expertise_categories" SET "is_active" = true, "updated_at" = NOW() WHERE "id" = ${categoryId}
      `
    } else {
      const inserted = await prisma.$queryRaw<{ id: number }[]>`
        INSERT INTO "scd_expertise_categories" ("name", "description", "is_active", "created_at", "updated_at")
        VALUES (${bundle.categoryName}, ${null}, true, NOW(), NOW())
        RETURNING "id"
      `
      categoryId = inserted[0].id
    }

    // Upsert specialties
    const subRows = bundle.subcategories.map((s) => ({
      name: s.name,
      expertise_category_id: categoryId,
    }))

    for (const batch of chunkArray(subRows, CHUNK)) {
      if (batch.length === 0) continue
      await prisma.$executeRaw`
        INSERT INTO "scd_specialties" ("name", "expertise_category_id", "is_active", "created_at", "updated_at")
        VALUES ${Prisma.join(
          batch.map((s) => Prisma.sql`(${s.name}, ${s.expertise_category_id}, true, NOW(), NOW())`)
        )}
        ON CONFLICT ("name", "expertise_category_id") DO UPDATE SET "is_active" = true, "updated_at" = NOW()
      `
    }
    totalSubs += subRows.length

    // Upsert skills
    const skillNames = new Set<string>()
    for (const sub of bundle.subcategories) {
      for (const raw of sub.skills) {
        const t = raw.trim()
        if (t) skillNames.add(t)
      }
    }

    const skillList = [...skillNames]
    for (const batch of chunkArray(skillList, CHUNK)) {
      if (batch.length === 0) continue
      await prisma.$executeRaw`
        INSERT INTO "scd_skills" ("name", "expertise_category_id", "is_active", "created_at", "updated_at")
        VALUES ${Prisma.join(
          batch.map((name) => Prisma.sql`(${name}, ${categoryId}, true, NOW(), NOW())`)
        )}
        ON CONFLICT ("name", "expertise_category_id") DO NOTHING
      `
    }
    totalSkills += skillList.length

    console.log(
      `   ✓ ${bundle.categoryName}: ${bundle.subcategories.length} subcategories, ${skillNames.size} unique skills`
    )
  }

  console.log(
    `✅ Expertise seed done: ${EXPERTISE_TAXONOMY_BUNDLES.length} categories, ${totalSubs} subcategories, ~${totalSkills} skill rows (deduped per category).`
  )
}

import { Prisma, PrismaClient } from '@prisma/client'
import { EXPERTISE_TAXONOMY_BUNDLES } from '../data/taxonomy'

const CHUNK = 400

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * Taxonomy rows live in scd_expertise_categories, scd_specialties, scd_skills.
 * We use raw SQL for deletes/inserts here so the seed works even when
 * `prisma generate` used different model names (e.g. ExpertiseCategory vs Category)
 * or Skill field names (expertise_category_id vs categoryId) — common when prod
 * schema and local schema drift or Prisma versions differ.
 */
export async function clearExpertiseTaxonomy(prisma: PrismaClient) {
  console.log('🗑️  Clearing old taxonomy data (skills, specialties, categories only — user data preserved)...')

  // Only clear taxonomy tables, NOT user data (UserExpertise, FounderProject, ServicePackage)
  const skills = await prisma.$executeRawUnsafe(`DELETE FROM "scd_skills"`)
  const subs = await prisma.$executeRawUnsafe(`DELETE FROM "scd_specialties"`)
  const cats = await prisma.$executeRawUnsafe(`DELETE FROM "scd_expertise_categories"`)
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
    const inserted = await prisma.$queryRaw<{ id: number }[]>`
      INSERT INTO "scd_expertise_categories" ("name", "description", "is_active", "created_at", "updated_at")
      VALUES (${bundle.categoryName}, ${null}, true, NOW(), NOW())
      RETURNING "id"
    `
    const categoryId = inserted[0].id

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
      `
    }
    totalSubs += subRows.length

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

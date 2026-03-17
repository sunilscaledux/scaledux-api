import { PrismaClient } from '@prisma/client'
import { EXPERTISE_TAXONOMY_BUNDLES } from '../data/taxonomy'

const CHUNK = 400

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * Removes all user-facing data tied to expertise categories, then the taxonomy tables.
 * Founder projects and service packages are deleted (they reference category/subcategory).
 */
export async function clearExpertiseTaxonomy(prisma: PrismaClient) {
  console.log('🗑️  Clearing old expertise data (user expertises, projects, packages, taxonomy)...')

  const deletedUe = await prisma.userExpertise.deleteMany({})
  console.log(`   UserExpertise removed: ${deletedUe.count}`)

  const deletedFp = await prisma.founderProject.deleteMany({})
  console.log(`   FounderProject removed: ${deletedFp.count}`)

  const deletedSp = await prisma.servicePackage.deleteMany({})
  console.log(`   ServicePackage removed: ${deletedSp.count}`)

  const deletedSkills = await prisma.skill.deleteMany({})
  console.log(`   Skill rows removed: ${deletedSkills.count}`)

  const deletedSubs = await prisma.subcategory.deleteMany({})
  console.log(`   Subcategory rows removed: ${deletedSubs.count}`)

  const deletedCats = await prisma.category.deleteMany({})
  console.log(`   Category rows removed: ${deletedCats.count}`)
}

export async function seedExpertise(prisma: PrismaClient) {
  await clearExpertiseTaxonomy(prisma)

  console.log('🎯 Seeding expertise taxonomy from prisma/data/taxonomy...')

  let totalSubs = 0
  let totalSkills = 0

  for (const bundle of EXPERTISE_TAXONOMY_BUNDLES) {
    const category = await prisma.category.create({
      data: {
        name: bundle.categoryName,
        description: null,
        is_active: true,
      },
    })

    const subRows = bundle.subcategories.map((s) => ({
      name: s.name,
      categoryId: category.id,
      is_active: true,
    }))

    for (const batch of chunkArray(subRows, CHUNK)) {
      await prisma.subcategory.createMany({ data: batch })
    }
    totalSubs += subRows.length

    const skillNames = new Set<string>()
    for (const sub of bundle.subcategories) {
      for (const raw of sub.skills) {
        const t = raw.trim()
        if (t) skillNames.add(t)
      }
    }

    const skillRows = [...skillNames].map((name) => ({
      name,
      categoryId: category.id,
      is_active: true,
    }))

    for (const batch of chunkArray(skillRows, CHUNK)) {
      await prisma.skill.createMany({
        data: batch,
        skipDuplicates: true,
      })
    }
    totalSkills += skillRows.length

    console.log(
      `   ✓ ${bundle.categoryName}: ${bundle.subcategories.length} subcategories, ${skillNames.size} unique skills`
    )
  }

  console.log(
    `✅ Expertise seed done: ${EXPERTISE_TAXONOMY_BUNDLES.length} categories, ${totalSubs} subcategories, ~${totalSkills} skill rows (deduped per category).`
  )
}

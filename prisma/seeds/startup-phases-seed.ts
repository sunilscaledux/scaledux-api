import { PrismaClient } from '@prisma/client'
import { STARTUP_PHASES } from '../data/startup-phases'

/**
 * Seeds the startup phases master data: phases, must-have/good-to-have activities, and deliverables.
 * Idempotent: uses upsert by display_index (phase) and (phase_id, type, order) for activities.
 * Does NOT touch UserStartupProgress (per-founder data is preserved).
 */
export async function seedStartupPhases(prisma: PrismaClient): Promise<void> {
  console.log('🚀 Seeding startup phases...')

  for (const phase of STARTUP_PHASES) {
    const upsertedPhase = await prisma.startupPhase.upsert({
      where: { display_index: phase.display_index },
      create: {
        index: phase.index,
        display_index: phase.display_index,
        industry_id: phase.industry_id,
        name: phase.name,
        short_name: phase.short_name,
        objective: phase.objective,
      },
      update: {
        index: phase.index,
        industry_id: phase.industry_id,
        name: phase.name,
        short_name: phase.short_name,
        objective: phase.objective,
      },
    })

    // Must-have activities — upsert by (phase_id, type, order)
    for (let i = 0; i < phase.must_have.length; i++) {
      const a = phase.must_have[i]
      await prisma.startupPhaseActivity.upsert({
        where: { phase_id_type_order: { phase_id: upsertedPhase.id, type: 'must_have', order: i } },
        create: {
          phase_id: upsertedPhase.id,
          type: 'must_have',
          order: i,
          title: a.title,
          details: a.details,
        },
        update: {
          title: a.title,
          details: a.details,
        },
      })
    }

    // Good-to-have activities
    for (let i = 0; i < phase.good_to_have.length; i++) {
      const a = phase.good_to_have[i]
      await prisma.startupPhaseActivity.upsert({
        where: { phase_id_type_order: { phase_id: upsertedPhase.id, type: 'good_to_have', order: i } },
        create: {
          phase_id: upsertedPhase.id,
          type: 'good_to_have',
          order: i,
          title: a.title,
          details: a.details,
        },
        update: {
          title: a.title,
          details: a.details,
        },
      })
    }

    // Deliverables — upsert by (phase_id, order)
    for (let i = 0; i < phase.deliverables.length; i++) {
      const d = phase.deliverables[i]
      await prisma.startupPhaseDeliverable.upsert({
        where: { phase_id_order: { phase_id: upsertedPhase.id, order: i } },
        create: {
          phase_id: upsertedPhase.id,
          order: i,
          title: d.title,
          details: d.details,
        },
        update: {
          title: d.title,
          details: d.details,
        },
      })
    }

    console.log(
      `   ✓ ${phase.name}: ${phase.must_have.length} must-have, ${phase.good_to_have.length} good-to-have, ${phase.deliverables.length} deliverables`
    )
  }

  console.log(`✅ Startup phases seeded: ${STARTUP_PHASES.length} phases`)
}

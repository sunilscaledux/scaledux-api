import { PrismaClient } from '@prisma/client'

// Source-of-truth constant files are kept in src/constants and imported here so
// the DB baseline always matches the code. Re-running is idempotent: existing
// rows keep their is_active flag (admin deactivations stick) — only sort_order
// and the display metadata are refreshed.
import {
  PROPOSAL_DECLINE_REASONS,
  OFFER_DECLINE_REASONS,
  WITHDRAW_OFFER_REASONS,
  WITHDRAW_PROPOSAL_REASONS,
  TERMINATE_REASONS,
  INVITATION_DECLINE_REASONS,
  REPORT_PROFILE_REASONS,
} from '../../src/constants/proposalReasons'
import { CONTRACT_END_REASONS } from '../../src/constants/contractEndReasons'
import { MEETING_REASONS } from '../../src/constants/meetingReasons'
import { STARTUP_STAGES } from '../../src/constants/startupStages'
import { FUNDING_STAGES, INVESTOR_TYPES, INVESTMENT_CRITERIA_OPTIONS } from '../../src/constants/fundingStages'
import { REVENUE_MODELS } from '../../src/constants/revenueModels'
import { ID_TYPES } from '../../src/constants/idTypes'

type Row = {
  group: string
  subkey?: string
  value: string
  label?: string
  description?: string
  code?: string
}

/** Build rows for a flat string list. value doubles as the stored + display text. */
function fromStrings(group: string, values: readonly string[], subkey = ''): Row[] {
  return values.map((value) => ({ group, subkey, value }))
}

export async function seedConstants(prisma: PrismaClient) {
  console.log('🧱 Seeding Constants...')

  const rows: Row[] = [
    // ── Proposal / offer / contract action reasons (stored as text on Proposal/ProjectInvite/ReportSpam) ──
    ...fromStrings('proposal_reason', PROPOSAL_DECLINE_REASONS, 'proposalDecline'),
    ...fromStrings('proposal_reason', OFFER_DECLINE_REASONS, 'offerDecline'),
    ...fromStrings('proposal_reason', WITHDRAW_OFFER_REASONS, 'withdrawOffer'),
    ...fromStrings('proposal_reason', WITHDRAW_PROPOSAL_REASONS, 'withdrawProposal'),
    ...fromStrings('proposal_reason', TERMINATE_REASONS, 'terminate'),
    ...fromStrings('proposal_reason', INVITATION_DECLINE_REASONS, 'invitationDecline'),
    ...fromStrings('proposal_reason', REPORT_PROFILE_REASONS, 'reportProfile'),

    // ── Contract end reasons (stored in Review.end_reason) ──
    ...fromStrings('contract_end_reason', CONTRACT_END_REASONS),

    // ── Meeting / booking reasons, namespaced by action type ──
    ...Object.entries(MEETING_REASONS).flatMap(([action, values]) =>
      fromStrings('meeting_reason', values as readonly string[], action)
    ),

    // ── Startup stage (CompanyProfile.company_stage) ──
    ...fromStrings('startup_stage', STARTUP_STAGES),

    // ── Funding stage (FundingRound/RaisingFund.funding_stage) ──
    ...fromStrings('funding_stage', FUNDING_STAGES),

    // ── Revenue models (CompanyProfile.revenue_models) ──
    ...fromStrings('revenue_model', REVENUE_MODELS),

    // ── Investment criteria options ──
    ...fromStrings('investment_criteria', INVESTMENT_CRITERIA_OPTIONS),

    // ── Investor types (object-shaped: value stored, label/description shown, code = slug id) ──
    ...INVESTOR_TYPES.map((t) => ({
      group: 'investor_type',
      value: t.value,
      label: t.label,
      description: t.description,
      code: t.id,
    })),

    // ── ID types (object-shaped: value stored, label shown) ──
    ...ID_TYPES.map((t) => ({ group: 'id_type', value: t.value, label: t.label })),
  ]

  let order: Record<string, number> = {}
  for (const r of rows) {
    const subkey = r.subkey ?? ''
    const bucket = `${r.group}::${subkey}`
    const sort_order = order[bucket] ?? 0
    order[bucket] = sort_order + 1

    await prisma.constant.upsert({
      where: { group_subkey_value: { group: r.group, subkey, value: r.value } },
      // Preserve is_active so admin deactivations survive re-seeds.
      update: { sort_order, label: r.label ?? null, description: r.description ?? null, code: r.code ?? null },
      create: {
        group: r.group,
        subkey,
        value: r.value,
        label: r.label ?? null,
        description: r.description ?? null,
        code: r.code ?? null,
        sort_order,
      },
    })
  }

  console.log(`✅ Seeded ${rows.length} constants across ${new Set(rows.map((r) => r.group)).size} groups`)
}

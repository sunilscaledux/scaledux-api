/**
 * One-off: mask identifiers already stored in full.
 * Covers CIN on agency verifications and the Aadhaar UID / driving licence number
 * held inside IdentityVerification.meta_data. Idempotent - a value that is already
 * masked is left alone, so it is safe to run more than once.
 *
 *   npx tsx scripts/mask-stored-identifiers.ts          # report only
 *   npx tsx scripts/mask-stored-identifiers.ts --apply  # write
 */
import { PrismaClient } from "@prisma/client";
import { maskTail } from "../src/utils/redact";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const alreadyMasked = (v: unknown): boolean =>
  typeof v === "string" && v.startsWith("****");

async function maskAgencyCins() {
  const rows = await prisma.agencyVerification.findMany({ select: { id: true, cin: true } });
  const pending = rows.filter((r) => r.cin && !alreadyMasked(r.cin));
  console.log(`agency_verifications: ${pending.length} of ${rows.length} still hold a full CIN`);

  if (!APPLY) return;
  for (const row of pending) {
    await prisma.agencyVerification.update({
      where: { id: row.id },
      data: { cin: maskTail(row.cin) },
    });
  }
  console.log(`agency_verifications: masked ${pending.length}`);
}

async function maskIdentityMetaData() {
  const rows = await prisma.identityVerification.findMany({ select: { id: true, meta_data: true } });

  let pending = 0;
  for (const row of rows) {
    const meta = row.meta_data as Record<string, unknown> | null;
    if (!meta) continue;

    const next = { ...meta };
    let changed = false;

    for (const field of ["aadhaarUid", "dlNumber"]) {
      const value = next[field];
      if (typeof value === "string" && value && !alreadyMasked(value)) {
        next[field] = maskTail(value);
        changed = true;
      }
    }

    if (!changed) continue;
    pending++;
    if (APPLY) {
      await prisma.identityVerification.update({
        where: { id: row.id },
        data: { meta_data: next as any },
      });
    }
  }

  console.log(
    `identity_verifications: ${pending} of ${rows.length} still hold a full Aadhaar UID or DL number` +
      (APPLY ? ` - masked ${pending}` : "")
  );
}

async function main() {
  console.log(APPLY ? "Applying changes.\n" : "Dry run. Re-run with --apply to write.\n");
  await maskAgencyCins();
  await maskIdentityMetaData();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

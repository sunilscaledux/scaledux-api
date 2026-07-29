/**
 * One-off: mask identifiers already stored in full.
 * Covers CIN on agency verifications and the Aadhaar UID / driving licence number
 * held inside IdentityVerification.meta_data. Idempotent - a value that is already
 * masked is left alone, so it is safe to run more than once.
 *
 *   npx tsx scripts/mask-stored-identifiers.ts          # report only
 *   npx tsx scripts/mask-stored-identifiers.ts --apply  # write
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { maskTail, maskIfsc, maskPan, isMasked } from "../src/utils/redact";

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

/**
 * PAN keeps only its masked form. GSTIN is left in full: invoices carry it verbatim.
 * gstin_api_response is the raw PAN provider payload (full name, PAN, dob) and is
 * cleared outright - nothing reads it.
 */
async function maskTaxInformation() {
  const rows = await prisma.taxInformation.findMany({
    select: { id: true, pan_number: true, gstin_api_response: true },
  });

  const pending = rows.filter(
    (r) => (r.pan_number && !isMasked(r.pan_number)) || r.gstin_api_response !== null
  );
  console.log(`tax_information: ${pending.length} of ${rows.length} still hold a full PAN or raw provider payload`);

  if (!APPLY) return;
  for (const row of pending) {
    await prisma.taxInformation.update({
      where: { id: row.id },
      data: {
        pan_number: row.pan_number ? maskPan(row.pan_number) : row.pan_number,
        gstin_api_response: Prisma.DbNull,
      },
    });
  }
  console.log(`tax_information: masked ${pending.length}`);
}

/** Account number and IFSC keep only their masked forms; last4 already lives in its own column. */
async function maskBankInformation() {
  const rows = await prisma.bankInformation.findMany({
    select: { id: true, account_number: true, ifsc: true },
  });

  const pending = rows.filter(
    (r) => (r.account_number && !isMasked(r.account_number)) || (r.ifsc && !isMasked(r.ifsc))
  );
  console.log(`bank_information: ${pending.length} of ${rows.length} still hold a full account number or IFSC`);

  if (!APPLY) return;
  for (const row of pending) {
    await prisma.bankInformation.update({
      where: { id: row.id },
      data: {
        account_number: row.account_number ? maskTail(row.account_number) : row.account_number,
        ifsc: row.ifsc ? maskIfsc(row.ifsc) : row.ifsc,
      },
    });
  }
  console.log(`bank_information: masked ${pending.length}`);
}

async function main() {
  console.log(APPLY ? "Applying changes.\n" : "Dry run. Re-run with --apply to write.\n");
  await maskAgencyCins();
  await maskIdentityMetaData();
  await maskTaxInformation();
  await maskBankInformation();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

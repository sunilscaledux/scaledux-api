import { prisma } from '@services/prismaService';

/**
 * Get the current Indian financial year string (April–March).
 * e.g. May 2025 → "2025-2026", Feb 2026 → "2025-2026"
 */
function getCurrentFinancialYear(): string {
  // Use IST for Indian compliance
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  if (month >= 3) {
    // April (3) onwards → current year to next
    return `${year}-${year + 1}`;
  }
  // Jan–March → previous year to current
  return `${year - 1}-${year}`;
}

/**
 * Generate the next sequential invoice number for a given type.
 * Format: SD-{type}-{startYear}-{NNNN}
 * e.g. SD-C-2025-0001, SD-A-2025-0042, SD-B-2025-0003
 *
 * Uses atomic upsert + increment to prevent race conditions.
 */
export async function getNextInvoiceNumber(type: 'C' | 'A' | 'B'): Promise<{
  invoiceNumber: string;
  financialYear: string;
  sequenceNumber: number;
}> {
  const financialYear = getCurrentFinancialYear();
  const startYear = financialYear.split('-')[0];

  const seq = await (prisma as any).invoiceSequence.upsert({
    where: {
      invoice_type_financial_year: {
        invoice_type: type,
        financial_year: financialYear,
      },
    },
    create: {
      invoice_type: type,
      financial_year: financialYear,
      last_number: 1,
    },
    update: {
      last_number: { increment: 1 },
    },
  });

  const sequenceNumber = seq.last_number;
  const invoiceNumber = `SD-${type}-${startYear}-${String(sequenceNumber).padStart(4, '0')}`;

  return { invoiceNumber, financialYear, sequenceNumber };
}

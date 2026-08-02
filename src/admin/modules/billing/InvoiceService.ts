import { prisma } from '@services/prismaService';
import { Log } from '@services/loggerService';
import { appConfig } from '@config/app';
import { tryDecryptPii, invoiceGstContext } from '@utils/crypto';
import { ServiceResponse } from '@utils/ApiResponse';

export type InvoiceVariant = 'A' | 'B' | 'C';

/** The three invoices a payment can produce, in the order admins expect to see them. */
export const INVOICE_LABELS: Record<InvoiceVariant, string> = {
  A: 'Service Invoice',
  B: 'Service Fee Invoice',
  C: 'Platform Fee Invoice',
};

const dec = (v: any) => (v != null ? parseFloat(v.toString()) : undefined);

/**
 * Invoice payload for the admin PDF renderer. Same data the user gets from their
 * billing history, except an admin may pull any of the three, not just their own.
 */
export class InvoiceService {
  static async getInvoiceData(uniqueId: string, type?: InvoiceVariant): Promise<ServiceResponse> {
    const transaction = await (prisma as any).billingTransaction.findUnique({
      where: { unique_id: uniqueId },
      include: {
        currency: true,
        payer_invoice: true,
        receiver_invoice: true,
        invoice_a: true,
        booking: { select: { unique_id: true, title: true, scheduled_at: true, duration: true, amount: true } },
        milestone: {
          select: {
            id: true,
            title: true,
            amount: true,
            order_index: true,
            proposal: {
              select: {
                unique_id: true,
                proposed_amount: true,
                milestonesRows: { select: { id: true, amount: true, payment_status: true } },
                project: {
                  select: { unique_id: true, project_title: true, budget_amount: true, budget_currency: true },
                },
              },
            },
          },
        },
      },
    });
    if (!transaction) return { success: false, message: 'Transaction not found', statusCode: 404 };

    const inv =
      type === 'A' ? transaction.invoice_a
      : type === 'B' ? transaction.receiver_invoice
      : type === 'C' ? transaction.payer_invoice
      : transaction.payer_invoice ?? transaction.invoice_a ?? transaction.receiver_invoice;
    if (!inv) return { success: false, message: 'Invoice not generated for this transaction', statusCode: 404 };

    const party: 'payer' | 'receiver' = inv.id === transaction.payer_invoice?.id ? 'payer' : 'receiver';
    const openGst = (value: any, field: 'sender' | 'receiver' | 'gst_number') =>
      tryDecryptPii(value, invoiceGstContext(transaction.id, inv.party, inv.invoice_type ?? null, field), (err: any) =>
        Log.error(`[Admin] Invoice ${field} decrypt failed for transaction ${transaction.id}`, { message: err?.message }));

    const invoiceGstNumber = openGst(inv.gst_number, 'gst_number');
    const milestone = transaction.milestone;

    return {
      success: true,
      message: 'OK',
      data: {
        uniqueId: transaction.unique_id,
        invoiceNumber: inv.invoice_number,
        party,
        subjectType: transaction.subject_type,
        gstNumber: invoiceGstNumber ?? inv.platform_gst ?? appConfig.platformGstNumber ?? undefined,
        platformGst: inv.platform_gst ?? undefined,
        senderGst: openGst(inv.sender_gst, 'sender') ?? undefined,
        receiverGst: openGst(inv.receiver_gst, 'receiver') ?? undefined,
        fee: dec(inv.fee),
        gstAmount: dec(inv.gst_amount),
        invoiceType: inv.invoice_type ?? null,
        platformFeeAmount: dec(inv.platform_fee_amount),
        commissionAmount: dec(inv.commission_amount),
        processingFeeAmount: dec(inv.processing_fee_amount),
        tcsAmount: dec(inv.tcs_amount),
        isBillOfSupply: inv.is_bill_of_supply === true,
        senderName: inv.sender_name,
        receiverName: inv.receiver_name,
        amount: dec(inv.amount) ?? 0,
        currencyCode: inv.currency_code,
        description: inv.description,
        type: transaction.type,
        status: transaction.status,
        issuedAt: inv.issued_at,
        meta: inv.meta ?? undefined,
        contractRef: milestone
          ? {
              projectId: milestone.proposal?.project?.unique_id ?? null,
              projectTitle: milestone.proposal?.project?.project_title ?? null,
              projectBudget: dec(milestone.proposal?.project?.budget_amount) ?? null,
              projectCurrency: milestone.proposal?.project?.budget_currency ?? null,
              contractId: milestone.proposal?.unique_id ?? null,
              contractAmount: dec(milestone.proposal?.proposed_amount) ?? null,
              totalFundedAmount:
                (milestone.proposal?.milestonesRows ?? [])
                  .filter((ms: any) => ms.payment_status === 'FUNDED' || ms.payment_status === 'RELEASED')
                  .reduce((sum: number, ms: any) => sum + (dec(ms.amount) ?? 0), 0) || null,
              milestoneTitle: milestone.title ?? null,
              milestoneAmount: dec(milestone.amount) ?? null,
              milestoneIndex: milestone.order_index ?? null,
              totalMilestones: milestone.proposal?.milestonesRows?.length ?? null,
            }
          : transaction.booking && inv.invoice_type === 'C'
            ? {
                amountPaid: dec(transaction.payer_amount) ?? dec(transaction.amount) ?? 0,
                bookingTitle: transaction.booking.title ?? '1:1 Video Call',
                bookingScheduledAt: transaction.booking.scheduled_at ?? null,
                bookingDuration: transaction.booking.duration ?? null,
              }
            : undefined,
      },
    };
  }
}

import { BaseJob } from './BaseJob';
import { prisma } from '../services/prismaService';
import { emailService } from '@services/emailService';
import { InvoiceGenerator } from '@services/InvoiceGenerator';
import { templateService } from '../services/templateService';
import { Log } from '@services/loggerService';

export interface InvoiceEmailPayload {
  /** BillingTransaction.id whose invoice (A) should be emailed */
  transactionId: number;
  /** User who should receive the invoice email */
  recipientUserId: number;
  /** Optional project/context title for the email copy */
  projectTitle?: string | null;
}

/**
 * Emails the generated invoice PDF (Invoice A) as an attachment to the recipient.
 * Runs on the queue so PDF generation never blocks the request.
 */
export class InvoiceEmailJob extends BaseJob<InvoiceEmailPayload> {
  async handle(data: InvoiceEmailPayload): Promise<void> {
    const tx = await (prisma as any).billingTransaction.findUnique({
      where: { id: data.transactionId },
      include: { currency: true, invoice_a: true }
    });
    if (!tx || !tx.invoice_a) {
      Log.warn(`InvoiceEmailJob: no invoice for transaction ${data.transactionId}, skipping`);
      return;
    }

    const recipient = await prisma.user.findUnique({
      where: { id: data.recipientUserId },
      select: { id: true, email: true, first_name: true }
    });
    if (!recipient?.email) {
      Log.warn(`InvoiceEmailJob: recipient ${data.recipientUserId} has no email, skipping`);
      return;
    }

    const inv = tx.invoice_a;
    const filePath = await InvoiceGenerator.generateInvoice({
      transactionId: tx.unique_id,
      uniqueId: inv.unique_id ?? tx.unique_id,
      invoiceNumber: inv.invoice_number ?? undefined,
      amount: Number(inv.amount ?? tx.amount),
      currency: inv.currency_code ?? tx.currency?.code ?? 'INR',
      type: String(tx.type),
      status: String(tx.status),
      description: inv.description ?? tx.description ?? 'Invoice',
      createdAt: inv.created_at ?? new Date(),
      senderName: inv.sender_name ?? undefined,
      receiverName: inv.receiver_name ?? undefined,
      actorType: tx.actor_type,
      actorId: tx.actor_id,
      fromType: tx.from_type,
      fromId: tx.from_id,
      toType: tx.to_type,
      toId: tx.to_id,
      subjectType: tx.subject_type,
      subjectId: tx.subject_id,
      fileName: `invoice-${inv.invoice_number ?? tx.unique_id}.pdf`
    });

    const title = data.projectTitle ? ` for "${data.projectTitle}"` : '';
    const compiled = await templateService.getCustomTemplate(
      'notification',
      {
        TITLE: 'Your invoice',
        MESSAGE: `Please find attached the invoice${title} (No. ${inv.invoice_number ?? tx.unique_id}).`,
        CTA_BUTTON: ''
      },
      'Your invoice',
      true
    );

    await emailService.sendEmail({
      to: recipient.email,
      subject: `Invoice ${inv.invoice_number ?? ''}${title}`.trim(),
      html: compiled.html,
      attachments: [{ filename: `invoice-${inv.invoice_number ?? tx.unique_id}.pdf`, path: filePath }]
    });
  }
}

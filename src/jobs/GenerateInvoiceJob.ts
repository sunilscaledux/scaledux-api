import { BaseJob, Job } from './BaseJob';
import { InvoiceGenerator } from '../services/InvoiceGenerator';
import { prisma } from '../services/prismaService';

// Job data interface
export interface GenerateInvoiceJobData {
  transactionId: number;
  uniqueId: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description: string;
  createdAt: Date;
  actorType: string;
  actorId: number;
  fromType: string;
  fromId: number;
  toType: string;
  toId: number;
  subjectType: string;
  subjectId: number;
}

@Job()
export class GenerateInvoiceJob extends BaseJob<GenerateInvoiceJobData> {
  async handle(data: GenerateInvoiceJobData): Promise<any> {
    console.log(`📄 Processing invoice generation for transaction: ${data.uniqueId}`);

    try {
      // Generate PDF invoice
      const invoicePath = await InvoiceGenerator.generateInvoice({
        transactionId: data.transactionId.toString(),
        uniqueId: data.uniqueId,
        amount: data.amount,
        currency: data.currency,
        type: data.type,
        status: data.status,
        description: data.description,
        createdAt: data.createdAt,
        actorType: data.actorType,
        actorId: data.actorId,
        fromType: data.fromType,
        fromId: data.fromId,
        toType: data.toType,
        toId: data.toId,
        subjectType: data.subjectType,
        subjectId: data.subjectId
      });

      // Update transaction with invoice URL
      const invoiceUrl = `/uploads/invoices/invoice-${data.uniqueId}.pdf`;
      await prisma.billingTransaction.update({
        where: { id: data.transactionId },
        data: { invoice_url: invoiceUrl }
      });

      console.log(`✅ Invoice generated successfully: ${invoicePath}`);
    } catch (error: any) {
      console.error(`❌ Error generating invoice for ${data.uniqueId}:`, error);
      throw error;
    }
  }

  // Override failed handler for custom error handling
  async failed(error: Error, data: GenerateInvoiceJobData): Promise<void> {
    console.error(`❌ Invoice generation failed for ${data.uniqueId}:`, error.message);
    
    // Optional: Update transaction status to failed
    await prisma.billingTransaction.update({
      where: { id: data.transactionId },
      data: { 
        invoice_url: null,
        // You could add a status field here
      }
    }).catch(err => console.error('Failed to update transaction:', err));
  }
}

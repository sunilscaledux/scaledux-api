import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

interface InvoiceData {
  transactionId: string;
  uniqueId: string;
  invoiceNumber?: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description: string;
  createdAt: Date;
  senderName?: string;
  receiverName?: string;
  actorType: string;
  actorId: number;
  fromType: string;
  fromId: number;
  toType: string;
  toId: number;
  subjectType: string;
  subjectId: number;
  /** If provided, use this for the PDF file name (e.g. invoice-xxx-payer.pdf) */
  fileName?: string;
}

export class InvoiceGenerator {
  private static invoicesDir = path.join(__dirname, '../../uploads/invoices');

  static async generateInvoice(data: InvoiceData): Promise<string> {
    if (!fs.existsSync(this.invoicesDir)) {
      fs.mkdirSync(this.invoicesDir, { recursive: true });
    }

    const fileName = data.fileName ?? `invoice-${data.uniqueId}.pdf`;
    const filePath = path.join(this.invoicesDir, fileName);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Header
        doc
          .fontSize(20)
          .text('INVOICE', 50, 50, { align: 'center' })
          .moveDown();

        // Company Info
        doc
          .fontSize(10)
          .text('ScaleDux Platform', 50, 100)
          .text('Invoice Management System', 50, 115)
          .moveDown();

        // Invoice Details
        doc
          .fontSize(12)
          .text(`Invoice #: ${data.invoiceNumber ?? data.uniqueId}`, 50, 160)
          .text(`Date: ${new Date(data.createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}`, 50, 180)
          .text(`Status: ${data.status.toUpperCase()}`, 50, 200)
          .moveDown();

        // Transaction Details
        doc
          .fontSize(14)
          .text('Transaction Details', 50, 240)
          .fontSize(10)
          .text(`Type: ${data.type.charAt(0).toUpperCase() + data.type.slice(1)}`, 50, 265)
          .text(`Description: ${data.description}`, 50, 285)
          .moveDown();

        // Payment Flow (use names when provided for client-side PDF)
        doc
          .fontSize(14)
          .text('Payment Flow', 50, 325)
          .fontSize(10)
          .text(`From: ${data.senderName ?? `${data.fromType} (ID: ${data.fromId})`}`, 50, 350)
          .text(`To: ${data.receiverName ?? `${data.toType} (ID: ${data.toId})`}`, 50, 370)
          .text(`Subject: ${data.subjectType} (ID: ${data.subjectId})`, 50, 390)
          .moveDown();

        // Amount Section
        doc
          .fontSize(14)
          .text('Amount Details', 50, 430);

        const isDebit = data.type === 'payment';
        const sign = isDebit ? '-' : '+';
        const currencySymbol = data.currency === 'INR' ? '₹' : '$';

        doc
          .fontSize(18)
          .fillColor(isDebit ? '#DC2626' : '#16A34A')
          .text(
            `${sign}${currencySymbol}${data.amount.toFixed(2)}`,
            50,
            460,
            { align: 'left' }
          )
          .fillColor('#000000');

        // Footer
        doc
          .fontSize(8)
          .text(
            'This is a computer-generated invoice and does not require a signature.',
            50,
            700,
            { align: 'center' }
          )
          .text(
            `Generated on ${new Date().toLocaleString()}`,
            50,
            715,
            { align: 'center' }
          );

        doc.end();

        stream.on('finish', () => {
          resolve(filePath);
        });

        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}

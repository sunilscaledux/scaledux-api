import { PrismaClient } from '@prisma/client'
import { ulid } from 'ulid'


const billingTransactionsData = [
  {
    userId: 1,
    amount: 5000.00,
    currencyCode: 'INR',
    type: 'payment' as const,
    status: 'completed' as const,
    description: 'Service package payment - Basic Web Design',
    invoiceUrl: 'https://example.com/invoices/INV-001'
  },
  {
    userId: 2,
    amount: 12500.00,
    currencyCode: 'INR',
    type: 'payment' as const,
    status: 'completed' as const,
    description: 'Project milestone payment',
    invoiceUrl: 'https://example.com/invoices/INV-002'
  },
  {
    userId: 3,
    amount: 3000.00,
    currencyCode: 'INR',
    type: 'payment' as const,
    status: 'pending' as const,
    description: 'Logo design service',
    invoiceUrl: null
  },
  {
    userId: 4,
    amount: 25000.00,
    currencyCode: 'INR',
    type: 'payment' as const,
    status: 'completed' as const,
    description: 'Full stack development - Phase 1',
    invoiceUrl: 'https://example.com/invoices/INV-004'
  },
  {
    userId: 5,
    amount: 1500.00,
    currencyCode: 'INR',
    type: 'refund' as const,
    status: 'completed' as const,
    description: 'Refund for cancelled service',
    invoiceUrl: 'https://example.com/invoices/INV-005'
  },
  {
    userId: 6,
    amount: 8000.00,
    currencyCode: 'INR',
    type: 'payment' as const,
    status: 'completed' as const,
    description: 'Mobile app UI/UX design',
    invoiceUrl: 'https://example.com/invoices/INV-006'
  },
  {
    userId: 7,
    amount: 15000.00,
    currencyCode: 'INR',
    type: 'payment' as const,
    status: 'completed' as const,
    description: 'E-commerce website development',
    invoiceUrl: 'https://example.com/invoices/INV-007'
  },
  {
    userId: 8,
    amount: 4500.00,
    currencyCode: 'INR',
    type: 'payment' as const,
    status: 'failed' as const,
    description: 'SEO optimization service',
    invoiceUrl: null
  },
  {
    userId: 9,
    amount: 20000.00,
    currencyCode: 'INR',
    type: 'withdrawal' as const,
    status: 'completed' as const,
    description: 'Earnings withdrawal',
    invoiceUrl: null
  },
  {
    userId: 10,
    amount: 10000.00,
    currencyCode: 'INR',
    type: 'payment' as const,
    status: 'completed' as const,
    description: 'Content writing package',
    invoiceUrl: 'https://example.com/invoices/INV-010'
  }
]

export async function seedBillingData(prisma: PrismaClient) {

  console.log('  💰 Seeding billing transactions...')
  for (const transaction of billingTransactionsData) {
    const currencyId = 1
    const uniqueId = ulid()
    
    const createdTransaction = await prisma.billingTransaction.create({
      data: {
        unique_id: uniqueId,
        // WHO triggered the action
        actor_type: 'User',
        actor_id: transaction.userId,
        // MONEY FROM (user pays)
        from_type: 'User',
        from_id: transaction.userId,
        // MONEY TO (platform receives)
        to_type: 'Platform',
        to_id: 1,
        // WHAT the transaction is about
        subject_type: 'ServicePackage',
        subject_id: 1,
        amount: transaction.amount,
        currency_id: currencyId,
        type: transaction.type,
        status: transaction.status,
        description: transaction.description,
        invoice_url: null // Will be updated after invoice generation
      }
    })
    console.log(`    ✓ Transaction for user ${transaction.userId}`)
  }

  console.log('✅ Billing data seeding completed!')
}

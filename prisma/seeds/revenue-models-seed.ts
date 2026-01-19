import { PrismaClient } from '@prisma/client'

export async function seedRevenueModels(prisma: PrismaClient) {
  console.log('💰 Seeding Revenue Models...')

  try {
    const revenueModels = [
      {
        name: 'Subscription',
        code: 'subscription',
        description: 'Recurring revenue from subscription-based services'
      },
      {
        name: 'Freemium',
        code: 'freemium',
        description: 'Free basic service with premium paid features'
      },
      {
        name: 'Transaction Fee',
        code: 'transaction_fee',
        description: 'Commission or fee per transaction'
      },
      {
        name: 'Advertising',
        code: 'advertising',
        description: 'Revenue from displaying advertisements'
      },
      {
        name: 'Licensing',
        code: 'licensing',
        description: 'Revenue from licensing intellectual property or software'
      },
      {
        name: 'Marketplace',
        code: 'marketplace',
        description: 'Commission from facilitating transactions between buyers and sellers'
      },
      {
        name: 'SaaS',
        code: 'saas',
        description: 'Software as a Service subscription model'
      },
      {
        name: 'E-commerce',
        code: 'ecommerce',
        description: 'Direct sales of products online'
      },
      {
        name: 'Affiliate',
        code: 'affiliate',
        description: 'Commission from referring customers to other businesses'
      },
      {
        name: 'Consulting',
        code: 'consulting',
        description: 'Revenue from professional services and consulting'
      },
      {
        name: 'Pay-per-use',
        code: 'pay_per_use',
        description: 'Usage-based pricing model'
      },
      {
        name: 'White Label',
        code: 'white_label',
        description: 'Selling products or services that can be rebranded'
      },
      {
        name: 'Data Monetization',
        code: 'data_monetization',
        description: 'Revenue from selling or licensing data insights'
      },
      {
        name: 'Hybrid',
        code: 'hybrid',
        description: 'Combination of multiple revenue streams'
      },
      {
        name: 'Other',
        code: 'other',
        description: 'Other revenue model not listed'
      }
    ]

    for (const model of revenueModels) {
      await prisma.revenueModel.upsert({
        where: { code: model.code },
        update: model,
        create: model
      })
    }

    console.log(`✅ Seeded ${revenueModels.length} revenue models`)
    console.log('✅ Revenue Models seeding completed!')

  } catch (error) {
    console.error('❌ Error seeding revenue models:', error)
    throw error
  }
}

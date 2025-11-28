import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const industries = [
  { name: 'Technology', description: 'Software, IT, Tech Services' },
  { name: 'Healthcare', description: 'Medical, Health Services, Pharmaceuticals' },
  { name: 'Finance', description: 'Banking, Insurance, FinTech' },
  { name: 'Education', description: 'Schools, Training, E-learning' },
  { name: 'E-commerce', description: 'Online Retail, Marketplaces' },
  { name: 'Manufacturing', description: 'Production, Industrial' },
  { name: 'Real Estate', description: 'Property, Construction' },
  { name: 'Media & Entertainment', description: 'Content, Gaming, Streaming' },
  { name: 'Transportation', description: 'Logistics, Shipping, Mobility' },
  { name: 'Food & Beverage', description: 'Restaurants, Food Services' },
  { name: 'Energy', description: 'Oil, Gas, Renewable Energy' },
  { name: 'Retail', description: 'Physical Stores, Consumer Goods' },
  { name: 'Consulting', description: 'Business Consulting, Advisory' },
  { name: 'Non-Profit', description: 'NGOs, Charities, Social Impact' },
  { name: 'Government', description: 'Public Sector, Municipal' },
  { name: 'Agriculture', description: 'Farming, Food Production' },
  { name: 'Travel & Tourism', description: 'Hotels, Travel Services' },
  { name: 'Sports & Fitness', description: 'Athletics, Wellness' },
  { name: 'Legal', description: 'Law Firms, Legal Services' },
  { name: 'Marketing & Advertising', description: 'Digital Marketing, PR' }
]

async function main() {
  console.log('🌱 Seeding industries...')
  
  for (const industry of industries) {
    await prisma.industry.upsert({
      where: { name: industry.name },
      update: {},
      create: industry
    })
  }
  
  console.log('✅ Industries seeded successfully!')
  console.log(`📊 Total industries: ${industries.length}`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding industries:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

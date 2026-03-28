import { PrismaClient } from '@prisma/client'

const industries = [
  { name: 'FinTech', description: 'Digital Payments, Lending, WealthTech, InsurTech' },
  { name: 'EdTech', description: 'K-12, Higher Ed, Skill Development, Corporate Training' },
  { name: 'HealthTech / MedTech', description: 'Telemedicine, Diagnostics, Mental Health, Pharma Tech' },
  { name: 'AgriTech', description: 'Precision Farming, Farm Management, Agri Marketplace' },
  { name: 'E-Commerce / D2C', description: 'B2C Marketplace, D2C Brands, Social Commerce' },
  { name: 'SaaS / Enterprise Tech', description: 'CRM, ERP, MarTech, DevOps, No-Code' },
  { name: 'AI / ML / Data', description: 'Generative AI, NLP, Computer Vision, MLOps' },
  { name: 'CleanTech / GreenTech', description: 'Solar, EV, Waste Management, Carbon Credits' },
  { name: 'Logistics & Supply Chain', description: 'Last-Mile, Freight, Warehouse, Fleet Management' },
  { name: 'PropTech / Real Estate Tech', description: 'Property Marketplace, Co-Living, Construction Tech' },
  { name: 'HRTech / Future of Work', description: 'Recruitment, HRMS, Payroll, Gig Economy' },
  { name: 'LegalTech', description: 'Contract Management, Compliance, IP Management' },
  { name: 'MediaTech / Content', description: 'Short Video, Podcasting, Creator Economy, AdTech' },
  { name: 'TravelTech / HospTech', description: 'OTA, Hotel Tech, Corporate Travel, Aviation' },
  { name: 'RetailTech', description: 'POS, Inventory, Omnichannel, Retail Analytics' },
  { name: 'FoodTech', description: 'Food Delivery, Cloud Kitchens, Alt Proteins, B2B Supply' },
  { name: 'AutoTech / Mobility', description: 'Ride-Hailing, EV, Autonomous Vehicles, Telematics' },
  { name: 'DeepTech / SpaceTech', description: 'Semiconductors, Robotics, Drones, Quantum, AR/VR' },
  { name: 'Cybersecurity', description: 'Network Security, Cloud Security, IAM, Fraud Detection' },
  { name: 'Web3 / Blockchain / Gaming', description: 'Mobile Gaming, DeFi, NFT, Metaverse' },
  { name: 'Consumer & Lifestyle', description: 'Fashion, Beauty, Pet Tech, Wedding, Sports' },
  { name: 'Manufacturing / Industry 4.0', description: 'Smart Manufacturing, IIoT, Predictive Maintenance' },
  { name: 'Social Impact / GovTech', description: 'Rural Tech, Civic Tech, Impact Investing, NGO Tech' },
  { name: 'InvestTech / VC & PE Tech', description: 'Deal Flow, Due Diligence, Cap Table, Fund Admin' },
  { name: 'Service-Based Industries', description: 'Digital Marketing, Software Dev, Design, Consulting' },
  { name: 'BioTech & Life Sciences', description: 'Genomics, Drug Discovery, Synthetic Biology' },
  { name: 'Chemical & Material Science', description: 'Specialty Chemicals, Nanomaterials, Advanced Composites' },
  { name: 'Defence & Dual-Use Tech', description: 'Surveillance, Defence Electronics, Military Drones' },
  { name: 'Infrastructure & Smart Cities', description: 'Smart City, Urban Mobility, Water & Sanitation' },
  { name: 'Ocean & Blue Economy', description: 'Maritime Tech, Aquaculture, Ocean Data' },
  { name: 'Telecom Tech', description: '5G, Satellite Internet, IoT Connectivity, UCaaS' }
]

export async function seedIndustries(prisma: PrismaClient) {
  console.log('Starting Industries seeding...')

  const newNames = industries.map(i => i.name)

  // Get IDs of old industries to clean up FK references
  const oldIndustries = await prisma.industry.findMany({
    where: { name: { notIn: newNames } },
    select: { id: true }
  })
  const oldIds = oldIndustries.map(i => i.id)

  if (oldIds.length > 0) {
    // Nullify FK references on related tables
    await prisma.companyProfile.updateMany({
      where: { industry_id: { in: oldIds } },
      data: { industry_id: null, sub_industry_id: null }
    })
    await (prisma as any).portfolio.updateMany({
      where: { industry_id: { in: oldIds } },
      data: { industry_id: null }
    })
    await (prisma as any).investorPortfolio.updateMany({
      where: { industry_id: { in: oldIds } },
      data: { industry_id: null, sub_industry_id: null }
    })
    await (prisma as any).investmentProfilePreferredIndustry.deleteMany({
      where: { industry_id: { in: oldIds } }
    })

    // Delete sub-industries of old industries (FK constraint)
    const deletedSubs = await prisma.subIndustry.deleteMany({
      where: { industry_id: { in: oldIds } }
    })
    if (deletedSubs.count > 0) {
      console.log(`  Deleted ${deletedSubs.count} old sub-industries`)
    }

    // Delete old industries
    const deleted = await prisma.industry.deleteMany({
      where: { id: { in: oldIds } }
    })
    if (deleted.count > 0) {
      console.log(`  Deleted ${deleted.count} old industries`)
    }
  }

  // Upsert new industries
  for (const industry of industries) {
    await prisma.industry.upsert({
      where: { name: industry.name },
      update: { description: industry.description, is_active: true },
      create: industry
    })
    console.log(`  Created/Updated industry: ${industry.name}`)
  }

  console.log('Industries seeding completed!')
  console.log(`Total industries: ${industries.length}`)
}

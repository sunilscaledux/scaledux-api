import { PrismaClient } from '@prisma/client'

export async function seedSubIndustriesAndBusinessModels(prisma: PrismaClient) {
  console.log('📊 Seeding Sub-Industries and Business Models...')

  try {
    // First, seed Business Models
    const businessModels = [
      {
        name: 'B2B (Business to Business)',
        code: 'b2b',
        description: 'Businesses that sell products or services to other businesses'
      },
      {
        name: 'B2C (Business to Consumer)',
        code: 'b2c',
        description: 'Businesses that sell products or services directly to consumers'
      },
      {
        name: 'B2B2C (Business to Business to Consumer)',
        code: 'b2b2c',
        description: 'Businesses that sell to other businesses who then sell to consumers'
      },
      {
        name: 'B2G (Business to Government)',
        code: 'b2g',
        description: 'Businesses that sell products or services to government entities'
      },
      {
        name: 'P2P (Peer to Peer)',
        code: 'p2p',
        description: 'Platform that facilitates transactions between individuals'
      },
      {
        name: 'C2C (Consumer to Consumer)',
        code: 'c2c',
        description: 'Platform where consumers sell to other consumers'
      },
      {
        name: 'C2B (Consumer to Business)',
        code: 'c2b',
        description: 'Consumers offer products or services to businesses'
      }
    ]

    for (const model of businessModels) {
      await prisma.businessModel.upsert({
        where: { code: model.code },
        update: model,
        create: model
      })
    }

    console.log(`✅ Seeded ${businessModels.length} business models`)

    // Get all industries to create sub-industries
    const industries = await prisma.industry.findMany()

    // Define sub-industries for each industry
    const subIndustriesData: { [key: string]: string[] } = {
      'Technology': [
        'SaaS (Software as a Service)',
        'PaaS (Platform as a Service)',
        'IaaS (Infrastructure as a Service)',
        'Artificial Intelligence',
        'Machine Learning',
        'Blockchain',
        'Cybersecurity',
        'Cloud Computing',
        'IoT (Internet of Things)',
        'Mobile Apps',
        'Web Development',
        'DevOps',
        'Data Analytics',
        'Big Data'
      ],
      'Finance': [
        'Fintech',
        'Banking',
        'Insurance',
        'Investment',
        'Wealth Management',
        'Payment Processing',
        'Cryptocurrency',
        'Digital Wallets',
        'Lending',
        'Credit Services',
        'Trading Platforms',
        'Financial Planning'
      ],
      'Healthcare': [
        'HealthTech',
        'Telemedicine',
        'Medical Devices',
        'Pharmaceuticals',
        'Biotechnology',
        'Mental Health',
        'Fitness & Wellness',
        'Healthcare IT',
        'Medical Records',
        'Diagnostics',
        'Hospital Management',
        'Home Healthcare'
      ],
      'Education': [
        'EdTech',
        'E-Learning',
        'Online Courses',
        'K-12 Education',
        'Higher Education',
        'Corporate Training',
        'Language Learning',
        'Test Preparation',
        'Educational Content',
        'Learning Management Systems',
        'Student Information Systems'
      ],
      'E-commerce': [
        'Marketplace',
        'Retail',
        'Fashion',
        'Electronics',
        'Groceries',
        'Subscription Services',
        'Dropshipping',
        'Social Commerce',
        'B2B E-commerce',
        'Direct-to-Consumer (D2C)'
      ],
      'Real Estate': [
        'PropTech',
        'Property Management',
        'Real Estate Investment',
        'Commercial Real Estate',
        'Residential Real Estate',
        'Rental Platforms',
        'Co-working Spaces',
        'Smart Buildings',
        'Construction Tech'
      ],
      'Media & Entertainment': [
        'Streaming Services',
        'Gaming',
        'Music',
        'Video Production',
        'Publishing',
        'Social Media',
        'Content Creation',
        'Advertising',
        'Events & Ticketing'
      ],
      'Transportation': [
        'Ride-sharing',
        'Logistics',
        'Delivery Services',
        'Fleet Management',
        'Autonomous Vehicles',
        'Electric Vehicles',
        'Public Transportation',
        'Freight & Shipping'
      ],
      'Food & Beverage': [
        'Food Delivery',
        'Restaurant Tech',
        'Cloud Kitchens',
        'Food Production',
        'Catering',
        'Meal Kits',
        'Grocery Delivery',
        'Food Safety'
      ],
      'Manufacturing': [
        'Industrial Automation',
        'Supply Chain',
        'Quality Control',
        'Product Design',
        '3D Printing',
        'Smart Manufacturing',
        'Robotics'
      ],
      'Agriculture': [
        'AgriTech',
        'Precision Farming',
        'Farm Management',
        'Agricultural Equipment',
        'Crop Monitoring',
        'Livestock Management',
        'Sustainable Agriculture'
      ],
      'Energy': [
        'Renewable Energy',
        'Solar Power',
        'Wind Energy',
        'Energy Storage',
        'Smart Grid',
        'Oil & Gas',
        'Energy Management'
      ],
      'Travel & Hospitality': [
        'Travel Booking',
        'Hotel Management',
        'Tour Operations',
        'Travel Tech',
        'Vacation Rentals',
        'Business Travel',
        'Travel Insurance'
      ],
      'Legal': [
        'LegalTech',
        'Contract Management',
        'Legal Research',
        'Compliance',
        'Document Automation',
        'Legal Practice Management'
      ],
      'Human Resources': [
        'HR Tech',
        'Recruitment',
        'Payroll',
        'Employee Benefits',
        'Performance Management',
        'Learning & Development',
        'Workforce Management'
      ]
    }

    let totalSubIndustries = 0

    for (const industry of industries) {
      const subIndustryNames = subIndustriesData[industry.name]
      
      if (subIndustryNames) {
        for (const subIndustryName of subIndustryNames) {
          await prisma.subIndustry.upsert({
            where: {
              industry_id_name: {
                industry_id: industry.id,
                name: subIndustryName
              }
            },
            update: {
              name: subIndustryName,
              is_active: true
            },
            create: {
              industry_id: industry.id,
              name: subIndustryName,
              is_active: true
            }
          })
          totalSubIndustries++
        }
        console.log(`  ✓ Added ${subIndustryNames.length} sub-industries for ${industry.name}`)
      }
    }

    console.log(`✅ Seeded ${totalSubIndustries} sub-industries across ${industries.length} industries`)
    console.log('✅ Sub-Industries and Business Models seeding completed!')

  } catch (error) {
    console.error('❌ Error seeding sub-industries and business models:', error)
    throw error
  }
}

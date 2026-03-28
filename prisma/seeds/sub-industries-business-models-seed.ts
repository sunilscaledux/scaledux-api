import { PrismaClient } from '@prisma/client'

export async function seedSubIndustriesAndBusinessModels(prisma: PrismaClient) {
  console.log('Seeding Sub-Industries and Business Models...')

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

    console.log(`Seeded ${businessModels.length} business models`)

    // Get all industries to create sub-industries
    const industries = await prisma.industry.findMany()

    // Define sub-industries for each industry (matching the ScaleDux dropdown reference)
    const subIndustriesData: { [key: string]: string[] } = {
      'FinTech': [
        'Digital Payments & Wallets',
        'Lending & Credit Tech',
        'WealthTech & Investment',
        'InsurTech',
        'Banking-as-a-Service (BaaS)',
        'RegTech & Compliance',
        'Crypto & Blockchain – Finance',
        'Buy Now Pay Later (BNPL)',
        'SME & Business Finance',
        'Cross-Border Payments & Remittance',
        'Personal Finance Management',
        'Neo-Banking'
      ],
      'EdTech': [
        'K-12 Education',
        'Higher Education & University Tech',
        'Test Prep & Competitive Exams',
        'Skill Development & Upskilling',
        'Corporate Training & L&D',
        'Language Learning',
        'Early Childhood Education',
        'Coding & STEM Education',
        'EdTech SaaS for Institutions',
        'Live Tutoring & Online Classes',
        'Career Guidance & Counselling',
        'Wellness Education & Certification'
      ],
      'HealthTech / MedTech': [
        'Telemedicine & Virtual Care',
        'Mental Health & Wellness',
        'Health Insurance Tech',
        'Diagnostics & Pathology Tech',
        'Wearables & Remote Monitoring',
        'Hospital & Clinic Management',
        'Pharmaceutical Tech',
        'Fitness & Preventive Health',
        'FemTech',
        'Elder Care Tech',
        'Ayurveda & Alternative Medicine',
        'Clinical Research & Trials Tech',
        'Yoga, Meditation & Mind-Body Wellness'
      ],
      'AgriTech': [
        'Precision Farming',
        'Farm Management Software',
        'Agri Input Marketplace',
        'Agri Output Marketplace',
        'Agri Finance & Insurance',
        'Cold Chain & Post-Harvest Tech',
        'Livestock & Aquaculture Tech',
        'Soil, Water & Irrigation Tech',
        'Agri Drones & Mechanisation',
        'Farm-to-Consumer (F2C)'
      ],
      'E-Commerce / D2C': [
        'B2C Marketplace',
        'D2C – Fashion & Apparel',
        'D2C – Beauty & Personal Care',
        'D2C – Food & Nutrition',
        'D2C – Home & Living',
        'D2C – Electronics & Gadgets',
        'Social Commerce',
        'Subscription Commerce',
        'Cross-Border E-Commerce',
        'Recommerce & Resale',
        'Grocery & Quick Commerce'
      ],
      'SaaS / Enterprise Tech': [
        'CRM & Sales Tech',
        'Marketing Tech (MarTech)',
        'ERP & Business Operations',
        'Customer Support & Helpdesk',
        'Analytics & Business Intelligence',
        'DevOps & Developer Tools',
        'Communication & Collaboration',
        'Workflow & Process Automation',
        'E-Sign & Document Management',
        'Accounting & Finance SaaS',
        'Procurement & Supply SaaS',
        'No-Code / Low-Code Platforms'
      ],
      'AI / ML / Data': [
        'Generative AI & LLMs',
        'Computer Vision',
        'Natural Language Processing (NLP)',
        'Vertical AI (Industry-Specific)',
        'Data Infrastructure & Pipelines',
        'MLOps & AI Dev Tools',
        'Conversational AI & Chatbots',
        'Predictive Analytics',
        'Synthetic Data & AI Training',
        'AI Governance & Explainability'
      ],
      'CleanTech / GreenTech': [
        'Solar & Renewable Energy',
        'EV & Charging Infrastructure',
        'Energy Storage & Batteries',
        'Waste Management & Recycling',
        'Carbon Credits & ESG Tech',
        'Water Tech & Conservation',
        'Green Building & Construction',
        'Climate Analytics & Risk',
        'Circular Economy Platforms'
      ],
      'Logistics & Supply Chain': [
        'Last-Mile Delivery',
        'Freight & Trucking Tech',
        'Warehouse Management',
        'Cold Chain Logistics',
        'Fleet Management & Telematics',
        'Cross-Border & International Logistics',
        'Reverse Logistics',
        'Supply Chain Visibility',
        'Drone & Autonomous Delivery'
      ],
      'PropTech / Real Estate Tech': [
        'Property Marketplace & Discovery',
        'Property Management',
        'Co-Living & Co-Working',
        'Fractional Real Estate Investment',
        'Construction Tech',
        'Smart Home & Building IoT',
        'Home Loan & Mortgage Tech',
        'Interior Design & Home Services'
      ],
      'HRTech / Future of Work': [
        'Recruitment & Talent Acquisition',
        'HRMS & Workforce Management',
        'Payroll & Benefits Management',
        'Employee Engagement & Culture',
        'Performance Management',
        'Background Verification (BGV)',
        'Gig Economy & Freelance Platforms',
        'Remote Work Infrastructure',
        'Staffing & RPO Tech'
      ],
      'LegalTech': [
        'Contract Management',
        'Legal Research & AI',
        'Compliance Management',
        'IP Management',
        'Legal Service Marketplaces',
        'Due Diligence & Transaction Tech',
        'Court & Litigation Tech',
        'Alternative Dispute Resolution (ADR)'
      ],
      'MediaTech / Content': [
        'Short Video & Reels',
        'Podcasting & Audio',
        'Creator Economy Platforms',
        'OTT & Streaming',
        'AdTech & Digital Advertising',
        'News & Publishing Tech',
        'Content Moderation & Trust',
        'Sports Tech & Fan Engagement',
        'Event & Ticketing Tech'
      ],
      'TravelTech / HospTech': [
        'Online Travel Agency (OTA)',
        'Hotel & Property Tech',
        'Experience & Tour Booking',
        'Corporate Travel Management',
        'Vacation Rental',
        'Aviation & Airport Tech',
        'Visa & Immigration Tech',
        'Travel Insurance Tech'
      ],
      'RetailTech': [
        'Point of Sale (POS) Systems',
        'Inventory & Catalogue Management',
        'Omnichannel Retail',
        'Loyalty & CRM for Retail',
        'Retail Analytics & Consumer Insights',
        'Hyperlocal & Neighbourhood Commerce'
      ],
      'FoodTech': [
        'Food Delivery & Aggregators',
        'Restaurant & Kitchen Tech',
        'Ghost Kitchens & Cloud Kitchens',
        'Alternative Proteins & Food Science',
        'Nutrition & Meal Planning',
        'B2B Food Supply & HORECA Tech',
        'Food Safety, Traceability & Quality'
      ],
      'AutoTech / Mobility': [
        'Ride-Hailing & Carpooling',
        'EV Manufacturing & Components',
        'Autonomous Vehicles & ADAS',
        'Auto Financing & Insurance',
        'Vehicle Telematics & Tracking',
        'Micro-Mobility',
        'Auto Marketplace & Services'
      ],
      'DeepTech / SpaceTech': [
        'Semiconductors & Chip Design',
        'Robotics & Automation',
        'Drones & UAVs',
        'Space Tech & Satellites',
        'Quantum Computing',
        'AR / VR / XR',
        'Photonics & Optics',
        'Nanotechnology'
      ],
      'Cybersecurity': [
        'Network & Infrastructure Security',
        'Cloud Security',
        'Identity & Access Management (IAM)',
        'Data Privacy & Governance',
        'Threat Intelligence',
        'Application Security (AppSec)',
        'Security Operations (SecOps)',
        'IoT & OT Security',
        'Fraud Detection & Prevention'
      ],
      'Web3 / Blockchain / Gaming': [
        'Mobile Gaming',
        'PC & Console Gaming',
        'Fantasy & Real Money Gaming (RMG)',
        'Web3 & NFT Gaming',
        'Metaverse & Virtual Worlds',
        'Blockchain Infrastructure',
        'DeFi (Decentralised Finance)',
        'NFT Marketplaces & Digital Assets'
      ],
      'Consumer & Lifestyle': [
        'Fashion & Apparel',
        'Beauty & Wellness Services',
        'Home & Living Services',
        'Pet Tech',
        'Senior & Elder Care',
        'Baby & Parenting',
        'Wedding & Events Planning',
        'Sports & Fitness',
        'Personal & Household Services',
        'Yoga & Wellness Studio Management'
      ],
      'Manufacturing / Industry 4.0': [
        'Smart Manufacturing',
        'Industrial IoT (IIoT)',
        'Quality Management Tech',
        'Predictive Maintenance',
        '3D Printing & Additive Manufacturing',
        'Procurement & B2B Industrial Marketplace',
        'Manufacturing ERP & MES'
      ],
      'Social Impact / GovTech': [
        'Rural & Livelihood Tech',
        'GovTech & Civic Tech',
        'Impact Investing & Reporting',
        'Disability & Inclusion Tech',
        'NGO & Non-Profit Tech',
        'Humanitarian & Disaster Tech',
        'Skilling for Underserved Segments'
      ],
      'InvestTech / VC & PE Tech': [
        'Deal Flow Management',
        'Due Diligence Platforms',
        'Cap Table Management',
        'Fund Administration Tech',
        'Portfolio Monitoring & Reporting',
        'LP Relations & Investor CRM',
        'SPV & Syndicate Platforms',
        'Valuation & Financial Modelling Tools',
        'Angel & Micro-VC Platforms',
        'Secondary Market & Liquidity Platforms'
      ],
      'Service-Based Industries': [
        'Digital Marketing Agencies',
        'Software & Technology Development',
        'UI/UX & Product Design',
        'Branding & Creative Agencies',
        'Content & Copywriting Services',
        'Video Production & Motion Graphics',
        'PR & Communications',
        'Management & Strategy Consulting',
        'Finance & Accounting Services',
        'Legal & Compliance Services',
        'HR & Talent Outsourcing',
        'Sales & Revenue Consulting',
        'IT Infrastructure & Managed Services',
        'Market Research & Consumer Insights',
        'Training & L&D Services',
        'Operations & Supply Chain Consulting',
        'Business Process Outsourcing (BPO)',
        'Executive Search & Headhunting',
        'Photography & Visual Content',
        'Event Management & Production',
        'Virtual Assistance & Admin Support',
        'Cybersecurity & IT Audit Services'
      ],
      'BioTech & Life Sciences': [
        'Genomics & Precision Medicine',
        'Drug Discovery & Development',
        'Diagnostics R&D',
        'Contract Research Organisations (CRO)',
        'Synthetic Biology',
        'Bioinformatics & Computational Biology',
        'Cell & Gene Therapy',
        'Bio-Manufacturing & Fermentation'
      ],
      'Chemical & Material Science': [
        'Specialty Chemicals',
        'Polymer & Advanced Plastics',
        'Nanomaterials & Nanotechnology',
        'Advanced Composites',
        'Battery & Energy Materials',
        'Construction & Sustainable Materials'
      ],
      'Defence & Dual-Use Tech': [
        'Surveillance & Intelligence Tech',
        'Border & Perimeter Security',
        'Defence Electronics & Systems',
        'Military Drones & Robotics',
        'Cybersecurity for Defence',
        'Simulation & Training Tech',
        'Defence Logistics & Supply Chain'
      ],
      'Infrastructure & Smart Cities': [
        'Smart City Platforms',
        'Urban Mobility & Transit Tech',
        'Water & Sanitation Infrastructure Tech',
        'Solid Waste & Sanitation Management',
        'Smart Grid & Energy Infrastructure',
        'Civic Services & e-Governance',
        'Street & Public Safety Tech',
        'Affordable Housing & Urban Planning Tech'
      ],
      'Ocean & Blue Economy': [
        'Maritime Tech & Port Management',
        'Aquaculture & Mariculture Tech',
        'Ocean Data & Remote Sensing',
        'Marine Renewable Energy',
        'Deep-Sea Mining & Resources'
      ],
      'Telecom Tech': [
        '5G Infrastructure & Networks',
        'MVNO & Virtual Telecom',
        'Satellite Internet & Connectivity',
        'Telecom SaaS & BSS/OSS',
        'IoT Connectivity & Platforms',
        'Telecom Analytics & AI',
        'Unified Communications (UCaaS)'
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
        console.log(`  Added ${subIndustryNames.length} sub-industries for ${industry.name}`)
      }
    }

    // Delete sub-industries that are no longer in the new list
    const allNewSubNames: string[] = Object.values(subIndustriesData).flat()
    const deletedOldSubs = await prisma.subIndustry.deleteMany({
      where: { name: { notIn: allNewSubNames } }
    })
    if (deletedOldSubs.count > 0) {
      console.log(`  Deleted ${deletedOldSubs.count} old sub-industries`)
    }

    console.log(`Seeded ${totalSubIndustries} sub-industries across ${industries.length} industries`)
    console.log('Sub-Industries and Business Models seeding completed!')

  } catch (error) {
    console.error('Error seeding sub-industries and business models:', error)
    throw error
  }
}

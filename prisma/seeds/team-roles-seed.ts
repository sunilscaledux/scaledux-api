import { PrismaClient } from '@prisma/client'

export async function seedTeamRoles(prisma: PrismaClient) {
  console.log('👥 Seeding Team Roles...')

  try {
    const teamRoles = [
      {
        name: 'Founder & CEO',
        code: 'founder_ceo',
        description: 'Chief Executive Officer and company founder'
      },
      {
        name: 'Co-Founder',
        code: 'co_founder',
        description: 'Company co-founder'
      },
      {
        name: 'CTO',
        code: 'cto',
        description: 'Chief Technology Officer'
      },
      {
        name: 'CFO',
        code: 'cfo',
        description: 'Chief Financial Officer'
      },
      {
        name: 'COO',
        code: 'coo',
        description: 'Chief Operating Officer'
      },
      {
        name: 'CMO',
        code: 'cmo',
        description: 'Chief Marketing Officer'
      },
      {
        name: 'CPO',
        code: 'cpo',
        description: 'Chief Product Officer'
      },
      {
        name: 'VP of Engineering',
        code: 'vp_engineering',
        description: 'Vice President of Engineering'
      },
      {
        name: 'VP of Sales',
        code: 'vp_sales',
        description: 'Vice President of Sales'
      },
      {
        name: 'VP of Marketing',
        code: 'vp_marketing',
        description: 'Vice President of Marketing'
      },
      {
        name: 'Head of Product',
        code: 'head_product',
        description: 'Head of Product Management'
      },
      {
        name: 'Head of Design',
        code: 'head_design',
        description: 'Head of Design'
      },
      {
        name: 'Engineering Manager',
        code: 'engineering_manager',
        description: 'Engineering team manager'
      },
      {
        name: 'Product Manager',
        code: 'product_manager',
        description: 'Product management role'
      },
      {
        name: 'Lead Developer',
        code: 'lead_developer',
        description: 'Lead software developer'
      },
      {
        name: 'Senior Developer',
        code: 'senior_developer',
        description: 'Senior software developer'
      },
      {
        name: 'Developer',
        code: 'developer',
        description: 'Software developer'
      },
      {
        name: 'Designer',
        code: 'designer',
        description: 'Product or UI/UX designer'
      },
      {
        name: 'Marketing Manager',
        code: 'marketing_manager',
        description: 'Marketing team manager'
      },
      {
        name: 'Sales Manager',
        code: 'sales_manager',
        description: 'Sales team manager'
      },
      {
        name: 'Operations Manager',
        code: 'operations_manager',
        description: 'Operations team manager'
      },
      {
        name: 'HR Manager',
        code: 'hr_manager',
        description: 'Human Resources manager'
      },
      {
        name: 'Advisor',
        code: 'advisor',
        description: 'Company advisor or consultant'
      },
      {
        name: 'Board Member',
        code: 'board_member',
        description: 'Member of the board of directors'
      }
    ]

    for (const role of teamRoles) {
      await prisma.teamRole.upsert({
        where: { code: role.code },
        update: role,
        create: role
      })
    }

    console.log(`✅ Seeded ${teamRoles.length} team roles`)
    console.log('✅ Team Roles seeding completed!')

  } catch (error) {
    console.error('❌ Error seeding team roles:', error)
    throw error
  }
}

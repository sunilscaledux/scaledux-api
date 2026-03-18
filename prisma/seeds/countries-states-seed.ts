import { PrismaClient } from '@prisma/client'

const indianStates = [
  { name: 'Andhra Pradesh', code: 'AP' },
  { name: 'Arunachal Pradesh', code: 'AR' },
  { name: 'Assam', code: 'AS' },
  { name: 'Bihar', code: 'BR' },
  { name: 'Chhattisgarh', code: 'CG' },
  { name: 'Goa', code: 'GA' },
  { name: 'Gujarat', code: 'GJ' },
  { name: 'Haryana', code: 'HR' },
  { name: 'Himachal Pradesh', code: 'HP' },
  { name: 'Jharkhand', code: 'JH' },
  { name: 'Karnataka', code: 'KA' },
  { name: 'Kerala', code: 'KL' },
  { name: 'Madhya Pradesh', code: 'MP' },
  { name: 'Maharashtra', code: 'MH' },
  { name: 'Manipur', code: 'MN' },
  { name: 'Meghalaya', code: 'ML' },
  { name: 'Mizoram', code: 'MZ' },
  { name: 'Nagaland', code: 'NL' },
  { name: 'Odisha', code: 'OR' },
  { name: 'Punjab', code: 'PB' },
  { name: 'Rajasthan', code: 'RJ' },
  { name: 'Sikkim', code: 'SK' },
  { name: 'Tamil Nadu', code: 'TN' },
  { name: 'Telangana', code: 'TS' },
  { name: 'Tripura', code: 'TR' },
  { name: 'Uttar Pradesh', code: 'UP' },
  { name: 'Uttarakhand', code: 'UK' },
  { name: 'West Bengal', code: 'WB' },
  // Union Territories
  { name: 'Andaman and Nicobar Islands', code: 'AN' },
  { name: 'Chandigarh', code: 'CH' },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DH' },
  { name: 'Delhi', code: 'DL' },
  { name: 'Jammu and Kashmir', code: 'JK' },
  { name: 'Ladakh', code: 'LA' },
  { name: 'Lakshadweep', code: 'LD' },
  { name: 'Puducherry', code: 'PY' }
]

export async function seedCountriesAndStates(prisma: PrismaClient, currencyMap: Map<string, any>) {
  console.log('🌍 Creating countries and states...')
  
  // Create India
  const india = await prisma.country.upsert({
    where: { code: "IN" },
    update: {
      currency_id: currencyMap.get("INR").id,
      phone_code: "+91",
    },
    create: {
      name: "India",
      code: "IN",
      phone_code: "+91",
      flag: "/flags/india.svg",
      currency_id: currencyMap.get("INR").id,
    },
  });
  console.log("✅ Created country:", india.name);

  // Create states for each country
  console.log('🏛️ Creating states...')
  
  // Create Indian states
  for (const state of indianStates) {
    const createdState = await prisma.state.upsert({
      where: {
        name_country_id: {
          name: state.name,
          country_id: india.id
        }
      },
      update: {},
      create: {
        name: state.name,
        code: state.code,
        country_id: india.id
      }
    })
    console.log('  📍 Created Indian state:', createdState.name)
  }

  console.log('✅ Countries and states seeding completed!')
}

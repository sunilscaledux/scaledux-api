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

const nepalStates = [
  { name: 'Koshi Province', code: 'P1' },
  { name: 'Madhesh Province', code: 'P2' },
  { name: 'Bagmati Province', code: 'P3' },
  { name: 'Gandaki Province', code: 'P4' },
  { name: 'Lumbini Province', code: 'P5' },
  { name: 'Karnali Province', code: 'P6' },
  { name: 'Sudurpashchim Province', code: 'P7' }
]

const usStates = [
  { name: 'Alabama', code: 'AL' },
  { name: 'Alaska', code: 'AK' },
  { name: 'Arizona', code: 'AZ' },
  { name: 'Arkansas', code: 'AR' },
  { name: 'California', code: 'CA' },
  { name: 'Colorado', code: 'CO' },
  { name: 'Connecticut', code: 'CT' },
  { name: 'Delaware', code: 'DE' },
  { name: 'Florida', code: 'FL' },
  { name: 'Georgia', code: 'GA' },
  { name: 'Hawaii', code: 'HI' },
  { name: 'Idaho', code: 'ID' },
  { name: 'Illinois', code: 'IL' },
  { name: 'Indiana', code: 'IN' },
  { name: 'Iowa', code: 'IA' },
  { name: 'Kansas', code: 'KS' },
  { name: 'Kentucky', code: 'KY' },
  { name: 'Louisiana', code: 'LA' },
  { name: 'Maine', code: 'ME' },
  { name: 'Maryland', code: 'MD' },
  { name: 'Massachusetts', code: 'MA' },
  { name: 'Michigan', code: 'MI' },
  { name: 'Minnesota', code: 'MN' },
  { name: 'Mississippi', code: 'MS' },
  { name: 'Missouri', code: 'MO' },
  { name: 'Montana', code: 'MT' },
  { name: 'Nebraska', code: 'NE' },
  { name: 'Nevada', code: 'NV' },
  { name: 'New Hampshire', code: 'NH' },
  { name: 'New Jersey', code: 'NJ' },
  { name: 'New Mexico', code: 'NM' },
  { name: 'New York', code: 'NY' },
  { name: 'North Carolina', code: 'NC' },
  { name: 'North Dakota', code: 'ND' },
  { name: 'Ohio', code: 'OH' },
  { name: 'Oklahoma', code: 'OK' },
  { name: 'Oregon', code: 'OR' },
  { name: 'Pennsylvania', code: 'PA' },
  { name: 'Rhode Island', code: 'RI' },
  { name: 'South Carolina', code: 'SC' },
  { name: 'South Dakota', code: 'SD' },
  { name: 'Tennessee', code: 'TN' },
  { name: 'Texas', code: 'TX' },
  { name: 'Utah', code: 'UT' },
  { name: 'Vermont', code: 'VT' },
  { name: 'Virginia', code: 'VA' },
  { name: 'Washington', code: 'WA' },
  { name: 'West Virginia', code: 'WV' },
  { name: 'Wisconsin', code: 'WI' },
  { name: 'Wyoming', code: 'WY' },
  // Federal District
  { name: 'District of Columbia', code: 'DC' }
]

const ukRegions = [
  // England
  { name: 'England', code: 'ENG' },
  // Scotland
  { name: 'Scotland', code: 'SCT' },
  // Wales
  { name: 'Wales', code: 'WLS' },
  // Northern Ireland
  { name: 'Northern Ireland', code: 'NIR' }
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

  // Create Nepal
  const nepal = await prisma.country.upsert({
    where: { code: "NP" },
    update: {
      currency_id: currencyMap.get("NPR").id,
      phone_code: "+977",
    },
    create: {
      name: "Nepal",
      code: "NP",
      phone_code: "+977",
      flag: "country/nepal.svg",
      currency_id: currencyMap.get("NPR").id,
    },
  });
  console.log('✅ Created country:', nepal.name)

  // Create United States
  const usa = await prisma.country.upsert({
    where: { code: "US" },
    update: {
      currency_id: currencyMap.get("USD").id,
      phone_code: "+1",
    },
    create: {
      name: "United States",
      code: "US",
      phone_code: "+1",
      flag: "country/usa.svg",
      currency_id: currencyMap.get("USD").id,
    },
  });
  console.log("✅ Created country:", usa.name);

  // Create United Kingdom
  const uk = await prisma.country.upsert({
    where: { code: "GB" },
    update: {
      currency_id: currencyMap.get("GBP").id,
      phone_code: "+44",
    },
    create: {
      name: "United Kingdom",
      code: "GB",
      phone_code: "+44",
      flag: "country/uk.svg",
      currency_id: currencyMap.get("GBP").id,
    },
  });
  console.log('✅ Created country:', uk.name)

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

  // Create Nepal states
  for (const state of nepalStates) {
    const createdState = await prisma.state.upsert({
      where: {
        name_country_id: {
          name: state.name,
          country_id: nepal.id
        }
      },
      update: {},
      create: {
        name: state.name,
        code: state.code,
        country_id: nepal.id
      }
    })
    console.log('  📍 Created Nepal state:', createdState.name)
  }

  // Create US states
  for (const state of usStates) {
    const createdState = await prisma.state.upsert({
      where: {
        name_country_id: {
          name: state.name,
          country_id: usa.id
        }
      },
      update: {},
      create: {
        name: state.name,
        code: state.code,
        country_id: usa.id
      }
    })
    console.log('  📍 Created US state:', createdState.name)
  }

  // Create UK regions
  for (const region of ukRegions) {
    const createdState = await prisma.state.upsert({
      where: {
        name_country_id: {
          name: region.name,
          country_id: uk.id
        }
      },
      update: {},
      create: {
        name: region.name,
        code: region.code,
        country_id: uk.id
      }
    })
    console.log('  📍 Created UK region:', createdState.name)
  }

  console.log('✅ Countries and states seeding completed!')
}

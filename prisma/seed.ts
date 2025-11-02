import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

const currencies = [
  { name: 'Indian Rupee', code: 'INR', symbol: '₹' },
  { name: 'Nepalese Rupee', code: 'NPR', symbol: 'Rs' },
  { name: 'US Dollar', code: 'USD', symbol: '$' },
  { name: 'British Pound', code: 'GBP', symbol: '£' },
  { name: 'Euro', code: 'EUR', symbol: '€' },
  { name: 'Japanese Yen', code: 'JPY', symbol: '¥' },
  { name: 'Chinese Yuan', code: 'CNY', symbol: '¥' },
  { name: 'Canadian Dollar', code: 'CAD', symbol: 'C$' },
  { name: 'Australian Dollar', code: 'AUD', symbol: 'A$' },
  { name: 'Swiss Franc', code: 'CHF', symbol: 'CHF' }
]

const nationalLanguages = [
  // Major Indian Languages
  { name: 'Hindi', native_name: 'हिन्दी', code: 'hi', country_code: 'IN' },
  { name: 'English', native_name: 'English', code: 'en', country_code: 'IN' },
  { name: 'Bengali', native_name: 'বাংলা', code: 'bn', country_code: 'IN' },
  { name: 'Telugu', native_name: 'తెలుగు', code: 'te', country_code: 'IN' },
  { name: 'Marathi', native_name: 'मराठी', code: 'mr', country_code: 'IN' },
  { name: 'Tamil', native_name: 'தமிழ்', code: 'ta', country_code: 'IN' },
  { name: 'Gujarati', native_name: 'ગુજરાતી', code: 'gu', country_code: 'IN' },
  { name: 'Urdu', native_name: 'اردو', code: 'ur', country_code: 'IN' },
  { name: 'Kannada', native_name: 'ಕನ್ನಡ', code: 'kn', country_code: 'IN' },
  { name: 'Odia', native_name: 'ଓଡ଼ିଆ', code: 'or', country_code: 'IN' },
  { name: 'Malayalam', native_name: 'മലയാളം', code: 'ml', country_code: 'IN' },
  { name: 'Punjabi', native_name: 'ਪੰਜਾਬੀ', code: 'pa', country_code: 'IN' },
  { name: 'Assamese', native_name: 'অসমীয়া', code: 'as', country_code: 'IN' },
  { name: 'Sanskrit', native_name: 'संस्कृतम्', code: 'sa', country_code: 'IN' },
  
  // Nepali
  { name: 'Nepali', native_name: 'नेपाली', code: 'ne', country_code: 'NP' },
  
  // Other major world languages
  { name: 'Chinese (Mandarin)', native_name: '中文', code: 'zh', country_code: 'CN' },
  { name: 'Spanish', native_name: 'Español', code: 'es', country_code: 'ES' },
  { name: 'French', native_name: 'Français', code: 'fr', country_code: 'FR' },
  { name: 'Arabic', native_name: 'العربية', code: 'ar', country_code: 'SA' },
  { name: 'Russian', native_name: 'Русский', code: 'ru', country_code: 'RU' },
  { name: 'Portuguese', native_name: 'Português', code: 'pt', country_code: 'PT' },
  { name: 'German', native_name: 'Deutsch', code: 'de', country_code: 'DE' },
  { name: 'Japanese', native_name: '日本語', code: 'ja', country_code: 'JP' },
  { name: 'Korean', native_name: '한국어', code: 'ko', country_code: 'KR' },
  { name: 'Italian', native_name: 'Italiano', code: 'it', country_code: 'IT' },
  { name: 'Dutch', native_name: 'Nederlands', code: 'nl', country_code: 'NL' },
  { name: 'Turkish', native_name: 'Türkçe', code: 'tr', country_code: 'TR' },
  { name: 'Persian', native_name: 'فارسی', code: 'fa', country_code: 'IR' },
  { name: 'Thai', native_name: 'ไทย', code: 'th', country_code: 'TH' },
  { name: 'Vietnamese', native_name: 'Tiếng Việt', code: 'vi', country_code: 'VN' }
]

async function main() {
  console.log('Starting seed...')

  // Create currencies first
  console.log('Creating currencies...')
  const currencyMap = new Map()
  for (const currency of currencies) {
    const createdCurrency = await prisma.currency.upsert({
      where: { code: currency.code },
      update: {},
      create: {
        name: currency.name,
        code: currency.code,
        symbol: currency.symbol
      }
    })
    currencyMap.set(currency.code, createdCurrency)
    console.log('Created currency:', createdCurrency.name)
  }

  // Create countries with their currencies
  console.log('Creating countries...')
  
  // Create India
  const india = await prisma.country.upsert({
    where: { code: 'IN' },
    update: { currency_id: currencyMap.get('INR').id },
    create: {
      name: 'India',
      code: 'IN',
      flag: '/flags/india.svg',
      currency_id: currencyMap.get('INR').id
    }
  })
  console.log('Created country:', india.name)

  // Create Nepal
  const nepal = await prisma.country.upsert({
    where: { code: 'NP' },
    update: { currency_id: currencyMap.get('NPR').id },
    create: {
      name: 'Nepal',
      code: 'NP',
      flag: '/flags/nepal.svg',
      currency_id: currencyMap.get('NPR').id
    }
  })
  console.log('Created country:', nepal.name)

  // Create United States
  const usa = await prisma.country.upsert({
    where: { code: 'US' },
    update: { currency_id: currencyMap.get('USD').id },
    create: {
      name: 'United States',
      code: 'US',
      flag: '/flags/usa.svg',
      currency_id: currencyMap.get('USD').id
    }
  })
  console.log('Created country:', usa.name)

  // Create United Kingdom
  const uk = await prisma.country.upsert({
    where: { code: 'GB' },
    update: { currency_id: currencyMap.get('GBP').id },
    create: {
      name: 'United Kingdom',
      code: 'GB',
      flag: '/flags/uk.svg',
      currency_id: currencyMap.get('GBP').id
    }
  })
  console.log('Created country:', uk.name)

  // Create states for each country
  console.log('Creating states...')
  
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
    console.log('Created Indian state:', createdState.name)
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
    console.log('Created Nepal state:', createdState.name)
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
    console.log('Created US state:', createdState.name)
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
    console.log('Created UK region:', createdState.name)
  }

  // Create languages
  for (const language of nationalLanguages) {
    const createdLanguage = await prisma.language.upsert({
      where: { code: language.code },
      update: {},
      create: {
        name: language.name,
        native_name: language.native_name,
        code: language.code,
        country_code: language.country_code,
        is_active: true
      }
    })
    console.log('Created language:', createdLanguage.name)
  }

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

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

  // Create India country
  const india = await prisma.country.upsert({
    where: { code: 'IN' },
    update: {},
    create: {
      name: 'India',
      code: 'IN',
      flag: '/flags/india.svg'
    }
  })

  console.log('Created country:', india)

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
    console.log('Created state:', createdState.name)
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

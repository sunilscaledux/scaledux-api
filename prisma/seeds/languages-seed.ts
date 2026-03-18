import { PrismaClient } from '@prisma/client'

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
]

export async function seedLanguages(prisma: PrismaClient) {
  console.log('🗣️ Creating languages...')
  
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
    console.log('  🌐 Created language:', createdLanguage.name)
  }

  console.log('✅ Languages seeding completed!')
}

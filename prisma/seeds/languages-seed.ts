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

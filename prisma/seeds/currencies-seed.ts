import { PrismaClient } from '@prisma/client'

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

export async function seedCurrencies(prisma: PrismaClient) {
  console.log('💰 Creating currencies...')
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
    console.log('  💵 Created currency:', createdCurrency.name)
  }

  console.log('✅ Currencies seeding completed!')
  return currencyMap
}

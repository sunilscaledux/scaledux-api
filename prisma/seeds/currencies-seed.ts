import { PrismaClient } from '@prisma/client'

const currencies = [
  { name: 'Indian Rupee', code: 'INR', symbol: '₹' }
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

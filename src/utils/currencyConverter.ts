import { prisma } from '../services/prismaService';

/**
 * Convert amount from USD to user's currency
 * @param userId - User ID to get currency preference
 * @param amountInUSD - Amount in USD to convert
 * @returns Converted amount in user's currency
 */
export async function convertToUserCurrency(userId: number, amountInUSD: number): Promise<{
  amount: number;
  currency: string;
}> {
  try {
    // Get user's currency from personal info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        personalInfo: {
          include: {
            currency: true
          }
        }
      }
    });

    const userCurrency = user?.personalInfo?.currency;
    const currencyCode = userCurrency?.code || 'USD';
    const exchangeRate = (userCurrency as any)?.exchange_rate || 1;

    // Convert amount: USD * exchange_rate = user's currency
    const convertedAmount = amountInUSD * Number(exchangeRate);

    return {
      amount: convertedAmount,
      currency: currencyCode
    };
  } catch (error) {
    console.error('Error converting currency:', error);
    // Return original amount in USD if conversion fails
    return {
      amount: amountInUSD,
      currency: 'USD'
    };
  }
}

/**
 * Convert amount from user's currency to USD
 * @param userId - User ID to get currency preference
 * @param amount - Amount in user's currency to convert
 * @returns Amount in USD
 */
export async function convertToUSD(userId: number, amount: number): Promise<number> {
  try {
    // Get user's currency from personal info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        personalInfo: {
          include: {
            currency: true
          }
        }
      }
    });

    const userCurrency = user?.personalInfo?.currency;
    const exchangeRate = (userCurrency as any)?.exchange_rate || 1;

    // Convert to USD: user's currency / exchange_rate = USD
    const amountInUSD = amount / Number(exchangeRate);

    return amountInUSD;
  } catch (error) {
    console.error('Error converting to USD:', error);
    // Return original amount if conversion fails
    return amount;
  }
}

/**
 * Get user's currency code
 * @param userId - User ID
 * @returns Currency code (e.g., 'USD', 'INR', 'EUR')
 */
export async function getUserCurrency(userId: number): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        personalInfo: {
          include: {
            currency: true
          }
        }
      }
    });

    return user?.personalInfo?.currency?.code || 'USD';
  } catch (error) {
    console.error('Error getting user currency:', error);
    return 'USD';
  }
}

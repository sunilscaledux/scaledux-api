import { prisma } from '../services/prismaService';
import { Log } from '@services/loggerService';

/**
 * Convert amount from USD to user's currency
 * @param userId - User ID to get currency preference
 * @param amountInUSD - Amount in USD to convert
 * @returns Converted amount in user's currency
 */
export async function convertToUserCurrency(userId: number, amountInUSD: number): Promise<{
  amount: number;
  currency: string;
  currencySymbol: string;
}> {
  try {
    // Get user's currency from User table
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        currency: true
      }
    });

    const currencyCode = user?.currency?.code || 'INR';
    const currencySymbol = user?.currency?.symbol || '₹';
    
    // For now, no conversion - just return amount with user's currency
    // TODO: Implement exchange rate conversion when needed
    // const exchangeRate = user?.currency?.exchange_rate || 1;
    // const convertedAmount = amountInUSD * Number(exchangeRate);

    return {
      amount: amountInUSD,
      currency: currencyCode,
      currencySymbol: currencySymbol
    };
  } catch (error) {
    Log.error('Error converting currency', { error });
    // Return original amount in INR if conversion fails
    return {
      amount: amountInUSD,
      currency: 'INR',
      currencySymbol: '₹'
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
  // For now, only INR is supported - return amount as-is
  return amount;

  // TODO: Implement multi-currency support when needed
  // try {
  //   // Get user's currency from personal info
  //   const user = await prisma.user.findUnique({
  //     where: { id: userId },
  //     include: {
  //       userProfiles: {
  //         include: {
  //           currency: true
  //         }
  //       }
  //     }
  //   });

  //   const userProfile = user?.userProfiles?.[0];
  //   const userCurrency = userProfile?.currency;
  //   const exchangeRate = (userCurrency as any)?.exchange_rate || 1;

  //   // Convert to USD: user's currency / exchange_rate = USD
  //   const amountInUSD = amount / Number(exchangeRate);

  //   return amountInUSD;
  // } catch (error) {
  //   Log.error("Error", { error });
  //   // Return original amount if conversion fails
  //   return amount;
  // }
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
        currency: true
      }
    });
 
    return user?.currency?.code || 'INR';
  } catch (error) {
    Log.error('Error getting user currency', { error });
    return 'INR';
  }
}

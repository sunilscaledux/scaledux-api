// Input from frontend after Razorpay verification
export interface CardPaymentMethodInput {
  paymentType: 'card';
  razorpayCustomerId: string;
  razorpayPaymentId: string;
  cardToken?: string; // Card token for future charges
  cardBrand: string;
  lastFourDigits: string;
  cardHolderName: string;
  expiryMonth: string;
  expiryYear: string;
  verificationAmount: number;
  isDefault?: boolean;
}

export interface PayPalPaymentMethodInput {
  paymentType: 'paypal';
  razorpayCustomerId: string;
  razorpayPaymentId: string;
  paypalEmail: string;
  paypalPayerId?: string;
  isDefault?: boolean;
}

export type PaymentMethodInput = CardPaymentMethodInput | PayPalPaymentMethodInput;

// Razorpay verification request
export interface RazorpayVerificationInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

import type { BillingTransactionTypeValue, BillingTransactionStatusValue } from "../../constants/status";

export interface BillingTransaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  type: BillingTransactionTypeValue;
  status: BillingTransactionStatusValue;
  description: string;
  invoiceUrl?: string;
  createdAt: Date;
}

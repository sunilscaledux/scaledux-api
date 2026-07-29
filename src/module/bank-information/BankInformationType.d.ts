export interface CreateBankInformationInput {
  type?: string;
  entityType?: 'INDIVIDUAL' | 'AGENCY';
  displayLabel: string;
  bankName?: string;
  accountNumber?: string;
  accountNumberLast4?: string;
  accountHolderName?: string;
  ifsc?: string;
  /** Email for Razorpay linked account. Defaults to user's ScaleDux email. Must be unique. */
  email?: string;
  /** OTP code sent to the email for verification. */
  otpCode?: string;
  /** Full PAN, re-entered by the user; only the masked form is stored. */
  panNumber?: string;
}

export interface UpdateBankInformationInput {
  displayLabel?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  ifsc?: string;
  /** Email for Razorpay linked account (only if changing). */
  email?: string;
  /** OTP code sent to the email for verification. */
  otpCode?: string;
  /** Full PAN, re-entered by the user; only the masked form is stored. */
  panNumber?: string;
}

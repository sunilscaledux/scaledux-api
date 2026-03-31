export interface CreateBankInformationInput {
  type?: string;
  entityType?: 'INDIVIDUAL' | 'AGENCY';
  displayLabel: string;
  bankName?: string;
  accountNumber?: string;
  accountNumberLast4?: string;
  accountHolderName?: string;
  ifsc?: string;
}

export interface UpdateBankInformationInput {
  displayLabel?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  ifsc?: string;
}

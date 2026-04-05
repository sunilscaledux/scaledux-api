export interface TaxInformationInput {
  taxResidence: {
    country: string;
    addressLine1: string;
    addressLine2?: string;
    state: string;
    city: string;
    zipCode: string;
  };
  activeTab: 'INDIVIDUAL' | 'AGENCY';
  name: string;
  panNumber: string;
  hasGSTIN: boolean;
  gstin?: string;
}

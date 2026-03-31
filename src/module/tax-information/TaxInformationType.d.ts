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
  individualName: string;
  individualPAN: string;
  individualHasGSTIN: boolean;
  individualGSTIN: string;
  individualGSTConsent?: boolean;
  agencyName: string;
  agencyPAN: string;
  agencyHasGSTIN: boolean;
  agencyGSTIN: string;
  agencyGSTConsent?: boolean;
}

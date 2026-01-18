export interface CreateCompanyDetailDto {
  company_name: string;
  company_tagline?: string;
  company_logo?: string;
  company_cover_image?: string;
  year_founded?: number;
  company_size?: string;
  headquarters?: string;
  company_location?: string;
  company_website?: string;
  industry?: string;
  company_type?: string;
  description?: string;
  problem_statement?: string;
  solution?: string;
  target_market?: string;
  unique_value_prop?: string;
  business_model?: string;
  revenue_model?: string;
  funding_stage?: string;
  total_funding?: number;
  seeking_funding?: boolean;
  funding_amount?: number;
  currency_id?: number;
  country_id?: number;
  state_id?: number;
  social_links?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    [key: string]: string | undefined;
  };
}

export interface UpdateCompanyDetailDto extends Partial<CreateCompanyDetailDto> {}

export interface CompanyDetailResponse {
  id: number;
  user_id: number;
  company_name?: string | null;
  company_tagline?: string | null;
  company_logo?: string | null;
  company_cover_image?: string | null;
  year_founded?: number | null;
  company_size?: string | null;
  headquarters?: string | null;
  company_location?: string | null;
  company_website?: string | null;
  industry?: string | null;
  company_type?: string | null;
  description?: string | null;
  problem_statement?: string | null;
  solution?: string | null;
  target_market?: string | null;
  unique_value_prop?: string | null;
  business_model?: string | null;
  revenue_model?: string | null;
  funding_stage?: string | null;
  total_funding?: number | null;
  seeking_funding?: boolean | null;
  funding_amount?: number | null;
  currency_id?: number | null;
  country_id?: number | null;
  state_id?: number | null;
  social_links?: any;
  created_at?: Date;
  updated_at?: Date;
  currency?: {
    id: number;
    name: string;
    code: string;
    symbol: string;
  } | null;
  country?: {
    id: number;
    name: string;
    code: string;
    flag: string | null;
  } | null;
  state?: {
    id: number;
    name: string;
    code: string | null;
  } | null;
}

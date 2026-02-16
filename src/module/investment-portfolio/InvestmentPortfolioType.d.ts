export interface CreateInvestmentPortfolioInput {
  companyName: string
  companyLogo?: string
  description?: string
  companyWebsite?: string
  industryId?: number
  subIndustryId?: number
  investmentSize?: number
  investmentSizeCurrency?: string
  investmentDate?: string
  roundParticipatedIn?: string
  currentStatus?: string
  boardAdvisoryRole?: string
  impactInCompanyGrowth?: string
  exitInformation?: string
  status?: 'DRAFT' | 'PUBLISHED'
}

export interface UpdateInvestmentPortfolioInput {
  companyName?: string
  companyLogo?: string
  description?: string
  companyWebsite?: string
  industryId?: number
  subIndustryId?: number
  investmentSize?: number
  investmentSizeCurrency?: string
  investmentDate?: string
  roundParticipatedIn?: string
  currentStatus?: string
  boardAdvisoryRole?: string
  impactInCompanyGrowth?: string
  exitInformation?: string
  status?: 'DRAFT' | 'PUBLISHED'
}

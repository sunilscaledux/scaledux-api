export interface CreateFounderProjectInput {
  projectTitle: string
  projectDescription: string
  categoryId: number
  subCategoryId?: number | null
  projectFiles?: Array<{ url: string }>
  scopeOfWork: string
  skillsRequired: string[]
  experienceNeeded: string
  budget: {
    currency: string
    amount: string
  }
  isNdaRequired: string
  screeningQuestions?: Array<{ question: string }>
  advancedPreferences: {
    englishLevel: string
    hireWithin: string
    timeRequirement: string
    earnedAmount: string
    loccation: string
    estimatedHours?: number | null
  }
  status?: 'DRAFT' | 'PUBLISHED'
}

export interface UpdateFounderProjectInput {
  projectTitle?: string
  projectDescription?: string
  categoryId?: number
  subCategoryId?: number | null
  projectFiles?: Array<{ url: string }>
  scopeOfWork?: string
  skillsRequired?: string[]
  experienceNeeded?: string
  budget?: {
    currency: string
    amount: string
  }
  isNdaRequired?: string
  screeningQuestions?: Array<{ question: string }>
  advancedPreferences?: {
    englishLevel: string
    hireWithin: string
    timeRequirement: string
    earnedAmount: string
    loccation: string
    estimatedHours?: number | null
  }
  status?: 'DRAFT' | 'PUBLISHED'
}

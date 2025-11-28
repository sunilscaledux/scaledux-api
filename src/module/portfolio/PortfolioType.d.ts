export interface CreatePortfolioInput {
  title: string
  description: string
  companyName: string
  hideCompanyName?: boolean
  industryId: number
  role?: string
  projectSkills?: string[]
  thumbnail?: string[]
  media?: string[]
  projectLink?: string
  completionMonth?: string
  completionYear?: string
  references?: Array<{ url: string }>
  status?: 'DRAFT' | 'PUBLISHED'
}

export interface UpdatePortfolioInput {
  title?: string
  description?: string
  companyName?: string
  hideCompanyName?: boolean
  industryId?: number
  role?: string
  projectSkills?: string[]
  thumbnail?: string[]
  media?: string[]
  projectLink?: string
  completionMonth?: string
  completionYear?: string
  references?: Array<{ url: string }>
  status?: 'DRAFT' | 'PUBLISHED'
}

export interface Portfolio {
  id: number
  user_id: number
  title: string
  description: string
  company_name: string
  hide_company_name: boolean
  industry: string
  role: string
  project_skills: string[]
  tools_used: string[]
  thumbnail_urls: string[]
  media_urls: string[]
  project_link?: string
  completion_month: string
  completion_year: string
  references?: Array<{ url: string }>
  status: 'DRAFT' | 'PUBLISHED'
  created_at: Date
  updated_at: Date
}

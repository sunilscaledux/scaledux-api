export interface WorkExperience {
  id: number
  user_id: number
  role: string
  company: string
  company_website?: string
  description?: string
  start_month: string
  start_year: string
  end_month?: string
  end_year?: string
  is_current: boolean
  created_at: Date
  updated_at: Date
}

export interface CreateWorkExperienceInput {
  role: string
  company: string
  company_website?: string
  description?: string
  start_month: string
  start_year: string
  end_month?: string
  end_year?: string
  is_current: boolean
}

export interface UpdateWorkExperienceInput {
  id: number
  role: string
  company: string
  company_website?: string
  description?: string
  start_month: string
  start_year: string
  end_month?: string
  end_year?: string
  is_current: boolean
}

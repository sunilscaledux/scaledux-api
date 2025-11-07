export interface License {
  id: number
  user_id: number
  institute: string
  license_name: string
  completed_month: string
  completed_year: string
  description?: string
  skills?: string[]
  created_at: Date
  updated_at: Date
}

export interface CreateLicenseInput {
  institute: string
  license_name: string
  completed_month: string
  completed_year: string
  description?: string
  skills?: string[]
}

export interface UpdateLicenseInput {
  id: number
  institute: string
  license_name: string
  completed_month: string
  completed_year: string
  description?: string
  skills?: string[]
}

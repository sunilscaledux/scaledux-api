export interface MediaFile {
  url: string
  name: string
  type: 'image' | 'document'
  size?: number
  mimeType?: string
}

export interface CreateAchievementInput {
  title: string
  description?: string
  company: string
  completed_month: string
  completed_year: string
  achievement_link?: string
  media_files?: string[]
}

export interface UpdateAchievementInput {
  id: number
  title: string
  description?: string
  company: string
  completed_month: string
  completed_year: string
  achievement_link?: string
  media_files?: string[]
}

export interface Achievement {
  id: number
  user_id: number
  title: string
  description?: string
  company: string
  completed_month: string
  completed_year: string
  achievement_link?: string
  media_files?: string[]
  created_at: string
  updated_at: string
}

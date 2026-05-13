export interface CreateSuccessStoryInput {
  title: string
  description?: string
  date?: string
  organisation_name: string
  client_name?: string
  linkedin_link?: string
  media_files?: string[]
}

export interface UpdateSuccessStoryInput {
  id: number
  title: string
  description?: string
  date?: string
  organisation_name: string
  client_name?: string
  linkedin_link?: string
  media_files?: string[]
}

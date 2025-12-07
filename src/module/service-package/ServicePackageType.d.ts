export interface ServicePackageInput {
  title: string
  category: string
  subCategory: string
  features?: string[]
  industry?: string[]
  keywords?: string[]
  scope?: any
  hasBasic?: boolean
  hasStandard?: boolean
  hasPremium?: boolean
  deliverables?: Array<{
    deliverable: string
    deliverDay: string
  }>
  faqs?: Array<{
    question: string
    answer: string
  }>
  links?: Array<{
    url: string
  }>
  requirements?: Array<{
    requirement: string
  }>
  status?: 'DRAFT' | 'PUBLISHED' | 'PAUSED'
}

export interface ServicePackageUpdateInput {
  title?: string
  category?: string
  subCategory?: string
  features?: string[]
  industry?: string[]
  keywords?: string[]
  scope?: any
  hasBasic?: boolean
  hasStandard?: boolean
  hasPremium?: boolean
  deliverables?: Array<{
    deliverable: string
    deliverDay: string
  }>
  faqs?: Array<{
    question: string
    answer: string
  }>
  links?: Array<{
    url: string
  }>
  requirements?: Array<{
    requirement: string
  }>
  status?: 'DRAFT' | 'PUBLISHED' | 'PAUSED'
}

export interface ServicePackageMediaUpload {
  fileName: string
  originalName: string
  filePath: string
  fileSize: number
  mimeType: string
  url: string
}

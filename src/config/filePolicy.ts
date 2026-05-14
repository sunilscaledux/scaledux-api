
export type FileVisibility = 'public' | 'private';

const policy: Record<string, FileVisibility> = {
  attachments: 'private',
  nda_file_link: 'private',
  nda_signed_file_link: 'private',
  document_urls: 'private',
  id_documents: 'private',
  selfie: 'private',
  thumbnail: 'public',
  documents: 'private',
  founder_project_files: 'public',
  portfolio_thumbnail: 'public',
  portfolio_files: 'public',
  profile_image: 'public',
  cover_image: 'public',
  company_profile_image: 'public',
  company_cover_image: 'public',
  company_traction_document: 'private',
  company_cap_table: 'public',
  team_member_profile_image: 'public',
  investment_portfolio_logo: 'public',
  target_market_document: 'private',
  traction_document: 'public',
  service_package_thumbnail: 'public',
  service_package_documents: 'public',
  service_package_media: 'public',
  proposal_attachments: 'public',
  proposal_nda: 'private',
  proposal_milestone_document: 'private',
  achievement_media: 'public',
  success_story_media: 'public',
  committee_member_photo: 'public',
  chat_files: 'private',
  identity_documents: 'private',
  identity_selfie: 'private',
  identity_address_proof: 'private',
  agency_documents: 'private',
  startup_deliverable: 'private',
  attachment: 'private',
};

export function getVisibility(_entityType: string, fieldName: string): FileVisibility {
  return policy[fieldName] ?? 'private';
}

export function getVisibilityByField(fieldKey: string): FileVisibility {
  return policy[fieldKey] ?? 'private';
}

export function isPublicField(fieldKey: string): boolean {
  return getVisibilityByField(fieldKey) === 'public';
}

export default { getVisibility, getVisibilityByField, isPublicField, policy };

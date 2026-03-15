/**
 * Which file fields are public vs private. Used when resolving attachment unique_id to URL.
 * Keys: "entityType.fieldName". Default for unknown = private.
 */
export type FileVisibility = 'public' | 'private';

const policy: Record<string, FileVisibility> = {
  // Profile (personal)
  'personalInfo.profileImage': 'public',
  'personalInfo.coverImage': 'public',
  // Company profile
  'companyProfile.profileImage': 'public',
  'companyProfile.coverImage': 'public',
  'companyProfile.traction_document': 'private',
  // Team member
  'teamMember.profile_image': 'public',
  // Portfolio
  'portfolio.thumbnail_url': 'public',
  'portfolio.media_urls': 'public',
  // Founder project
  'founderProject.project_files': 'private',
  // Proposal
  'proposal.attachments': 'private',
  'proposal.nda_file_link': 'private',
  'proposal.nda_signed_file_link': 'private',
  // Service package
  'servicePackage.thumbnail': 'public',
  'servicePackage.documents': 'private',
  // Billing / invoice
  'billingTransaction.file_url': 'private',
  // Verification
  'identityVerification.id_documents': 'private',
  'identityVerification.selfie': 'private',
  'identityVerification.address_proof': 'private',
  'agencyVerification.document_urls': 'private',
  // Chat
  'message.attachments': 'private',
  // Generic upload (e.g. general file upload route)
  'generic.attachment': 'private',
};

export function getVisibility(entityType: string, fieldName: string): FileVisibility {
  const key = `${entityType}.${fieldName}`;
  return policy[key] ?? 'private';
}

export function isPublic(entityType: string, fieldName: string): boolean {
  return getVisibility(entityType, fieldName) === 'public';
}

export default { getVisibility, isPublic, policy };

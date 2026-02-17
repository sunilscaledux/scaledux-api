/**
 * Chat system message template constants.
 * Used for sent/received variants; append project title where needed (e.g. `${PROJECT_INVITATION_RECEIVED}: ${projectTitle}`).
 */

export const CHAT_SYSTEM_MESSAGES = {
  PROJECT_INVITATION_SENT: "Project invitation sent",
  PROJECT_INVITATION_RECEIVED: "New project invitation received",
  PROJECT_INVITATION_ACCEPTED_SENT: "You accepted the project invitation",
  PROJECT_INVITATION_ACCEPTED_RECEIVED: "Accepted the project invitation",
  PROJECT_INVITATION_REJECTED_SENT: "You rejected the project invitation",
  PROJECT_INVITATION_REJECTED_RECEIVED: "Rejected the project invitation",

  PROPOSAL_SUBMITTED_SENT: "Proposal submitted for",
  PROPOSAL_SUBMITTED_RECEIVED: "New proposal submitted for",

  PROPOSAL_ACCEPTED_SENT: "Proposal accepted",
  PROPOSAL_ACCEPTED_RECEIVED: "Proposal accepted",

  PROPOSAL_REJECTED_SENT: "Proposal rejected",
  PROPOSAL_REJECTED_RECEIVED: "Proposal rejected",

  PROPOSAL_WITHDRAWN_SENT: "Proposal withdrawn",
  PROPOSAL_WITHDRAWN_RECEIVED: "Proposal withdrawn",

  REQUEST_MODIFY_SENT: "You requested changes for",
  REQUEST_MODIFY_RECEIVED: "Founder requested changes to your proposal for"
} as const;

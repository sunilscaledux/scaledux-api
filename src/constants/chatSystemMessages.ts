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

  PROPOSAL_SUBMITTED_SENT: "You submitted a proposal for",
  PROPOSAL_SUBMITTED_RECEIVED: "A new proposal received for",

  PROPOSAL_ACCEPTED_SENT: "You accepted the proposal",
  PROPOSAL_ACCEPTED_RECEIVED: "Accepted the proposal",

  PROPOSAL_REJECTED_SENT: "You rejected the proposal",
  PROPOSAL_REJECTED_RECEIVED: "Rejected the proposal",

  PROPOSAL_WITHDRAWN_SENT: "You withdrew the proposal",
  PROPOSAL_WITHDRAWN_RECEIVED: "Withdrew the proposal", 

  REQUEST_MODIFY_SENT: "You requested changes for",
  REQUEST_MODIFY_RECEIVED: "Requested changes to your proposal for",

  CONTRACT_SENT_SENT: "Contract sent",
  CONTRACT_SENT_RECEIVED: "Contract sent",
  NDA_SIGN_REQUEST: "Please sign the NDA and upload it to proceed.",

  CONTRACT_SIGNED_SENT: "You signed the contract",
  CONTRACT_SIGNED_RECEIVED: "Contract signed",

  PAYMENT_RELEASE_SENT: "Payment for",
  PAYMENT_RELEASE_RECEIVED: "Payment for"
} as const;

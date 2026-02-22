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

  PROPOSAL_UPDATED_SENT: "You updated your proposal for",
  PROPOSAL_UPDATED_RECEIVED: "Proposal was updated for",

  PROPOSAL_ACCEPTED_SENT: "You accepted the proposal",
  PROPOSAL_ACCEPTED_RECEIVED: "Accepted the proposal",

  OFFER_SENT_SENT: "You sent an offer",
  OFFER_SENT_RECEIVED: "You have received an offer",

  PROPOSAL_REJECTED_SENT: "You rejected the proposal",
  PROPOSAL_REJECTED_RECEIVED: "Rejected the proposal",

  PROPOSAL_WITHDRAWN_SENT: "You withdrew the proposal",
  PROPOSAL_WITHDRAWN_RECEIVED: "Withdrew the proposal", 

  REQUEST_MODIFY_SENT: "You requested changes for",
  REQUEST_MODIFY_RECEIVED: "Requested changes to your proposal for",

  DELIVERABLE_SUBMITTED_SENT: "You submitted work for",
  DELIVERABLE_SUBMITTED_RECEIVED: "Work submitted for review for",
  DELIVERABLE_REQUEST_CHANGES_SENT: "You requested changes on deliverable for",
  DELIVERABLE_REQUEST_CHANGES_RECEIVED: "Changes requested on your deliverable for",

  DELIVERABLE_APPROVED_SENT: "You approved deliverable for",
  DELIVERABLE_APPROVED_RECEIVED: "Client approved your deliverable for",

  MILESTONE_APPROVED_SENT: "You approved the milestone",
  MILESTONE_APPROVED_RECEIVED: "Client approved your milestone",

  MILESTONE_REQUESTED_SENT: "You requested a new milestone for",
  MILESTONE_REQUESTED_RECEIVED: "Freelancer requested a new milestone for",

  CONTRACT_SENT_SENT: "Contract sent",
  CONTRACT_SENT_RECEIVED: "Contract sent",
  NDA_SIGN_REQUEST: "Please sign the NDA and upload it to proceed.",

  CONTRACT_SIGNED_SENT: "You signed the contract",
  CONTRACT_SIGNED_RECEIVED: "Contract signed",

  PAYMENT_RELEASE_SENT: "Funded milestone",
  PAYMENT_RELEASE_RECEIVED: "Funded milestone",

  OFFER_CANCELLED_SENT: "You withdrew the hire offer for",
  OFFER_CANCELLED_RECEIVED: "The hire offer was withdrawn for",

  OFFER_DECLINED_SENT: "You declined the offer for",
  OFFER_DECLINED_RECEIVED: "The freelancer declined the offer for",

  CONTRACT_TERMINATED_SENT: "You terminated the contract for",
  CONTRACT_TERMINATED_RECEIVED: "The contract was terminated for"
} as const;

import { Router } from "express";
import {
  createProposal,
  getMyProposals,
  getProposalsByProject,
  getFounderContracts,
  getProposalById,
  updateProposal,
  updateProposalStatus,
  setHire,
  cancelHire,
  declineOffer,
  terminateContract,
  markProjectCompleted,
  updateProposalNda,
  withdrawProposal,
  checkProposalStatus,
  requestModify,
  getProposalActivities,
  addMilestone
} from "./ProposalController";
import { submitMilestone, requestChangesMilestone, approveMilestone, releaseMilestonePayment } from "./MilestoneController";
import { submitDeliverable, requestChangesDeliverable, approveDeliverable } from "./DeliverableController";
import { authenticateToken } from "@middleware/auth";
import { uploadFile } from "@module/general/FileController";
import { FileUpload, handleMulterError } from "@middleware/fileupload";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// File upload route for proposal attachments (images only)
router.post(
  "/upload-images",
  FileUpload({ 
    uploadPath: "proposals/attachments", 
    fileFilter: "image", 
    maxSize: 5, 
    maxFiles: 5 
  }).array("files"),
  uploadFile,
  handleMulterError
);
 
// NDA document upload (founder, for send-offer flow)
router.post(
  "/upload-nda",
  FileUpload({
    uploadPath: "proposals/nda",
    fileFilter: "document",
    maxSize: 5,
    maxFiles: 1
  }).array("files"),
  uploadFile,
  handleMulterError
);

// Milestone deliverable upload (freelancer): images, video, audio, zip, documents; max 5 files per request, each up to 500MB
router.post(
  "/upload-milestone-document",
  FileUpload({
    uploadPath: "proposals/milestone-documents",
    fileFilter: "milestoneDeliverable",
    maxSize: 500,
    maxFiles: 1
  }).array("files"),
  uploadFile,
  handleMulterError
);

// Service provider routes
router.post("/", createProposal); // Submit a proposal
router.get("/", getMyProposals); // Get my proposals
router.get("/check/:projectId", checkProposalStatus); // Check if already submitted

// Founder routes
router.get("/project/:projectId", getProposalsByProject); // Get proposals for a project
router.get("/founder/contracts", getFounderContracts); // Get founder contracts by status (OFFER_SENT, OFFER_ACCEPTED, HIRED)

// Milestone submit (freelancer: submit with remark + submitted_file; no separate documents table)
router.post("/milestones/:milestoneId/submit", submitMilestone);
router.post("/milestones/:milestoneId/request-changes", requestChangesMilestone);
router.post("/milestones/:milestoneId/approve", approveMilestone);
router.post("/milestones/:milestoneId/release-payment", releaseMilestonePayment);

// Per-deliverable submit, request changes, approve
router.post("/deliverables/:deliverableId/submit", submitDeliverable);
router.post("/deliverables/:deliverableId/request-changes", requestChangesDeliverable);
router.post("/deliverables/:deliverableId/approve", approveDeliverable);

// Add new milestone (freelancer, OFFER_ACCEPTED or HIRED)
router.post("/:id/milestones", addMilestone);

// Shared routes
router.get("/:id", getProposalById); // Get proposal details

// Status update (founder) - must be before PUT /:id
router.put("/:id/status", updateProposalStatus);
// Set hire (founder) - after NDA signed
router.post("/:id/hire", setHire);
// Cancel hire / withdraw offer (founder)
router.post("/:id/cancel-hire", cancelHire);
// Decline offer (freelancer only, OFFER_SENT only)
router.post("/:id/decline-offer", declineOffer);
// Terminate contract (founder or freelancer, HIRED only)
router.post("/:id/terminate", terminateContract);
// Mark project completed (founder, HIRED only, all milestones PAID/COMPLETED)
router.post("/:id/mark-project-completed", markProjectCompleted);
// NDA update (founder)
router.patch("/:id/nda", updateProposalNda);
// Request modify (founder)
router.post("/:id/request-modify", requestModify);
// Get activities (founder or provider)
router.get("/:id/activities", getProposalActivities);
// Service provider: update proposal content (PENDING only)
router.put("/:id", updateProposal);

router.delete("/:id", withdrawProposal); // Withdraw proposal (service provider)

export default router;

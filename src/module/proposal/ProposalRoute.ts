import { Router } from "express";
import {
  createProposal,
  getMyProposals,
  getProposalsByProject,
  getProposalById,
  updateProposal,
  updateProposalStatus,
  setHire,
  cancelHire,
  updateProposalNda,
  withdrawProposal,
  checkProposalStatus,
  requestModify,
  getProposalActivities
} from "./ProposalController";
import { addMilestoneDocument, submitMilestone } from "./MilestoneController";
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

// Milestone deliverable upload (freelancer): max 5 files per milestone, each up to 500MB
router.post(
  "/upload-milestone-document",
  FileUpload({
    uploadPath: "proposals/milestone-documents",
    fileFilter: "document",
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

// Milestone documents (freelancer: upload doc for a milestone) - must be before /:id
router.post("/milestones/:milestoneId/documents", addMilestoneDocument);
router.post("/milestones/:milestoneId/submit", submitMilestone);

// Shared routes
router.get("/:id", getProposalById); // Get proposal details

// Status update (founder) - must be before PUT /:id
router.put("/:id/status", updateProposalStatus);
// Set hire (founder) - after NDA signed
router.post("/:id/hire", setHire);
// Cancel hire / withdraw offer (founder)
router.post("/:id/cancel-hire", cancelHire);
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

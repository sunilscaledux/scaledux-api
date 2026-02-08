import { Router } from "express";
import {
  createProposal,
  getMyProposals,
  getProposalsByProject,
  getProposalById,
  updateProposal,
  updateProposalStatus,
  withdrawProposal,
  checkProposalStatus,
  requestModify,
  getProposalActivities
} from "./ProposalController";
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

// Service provider routes
router.post("/", createProposal); // Submit a proposal
router.get("/", getMyProposals); // Get my proposals
router.get("/check/:projectId", checkProposalStatus); // Check if already submitted

// Founder routes
router.get("/project/:projectId", getProposalsByProject); // Get proposals for a project

// Shared routes
router.get("/:id", getProposalById); // Get proposal details

// Status update (founder) - must be before PUT /:id
router.put("/:id/status", updateProposalStatus);
// Request modify (founder)
router.post("/:id/request-modify", requestModify);
// Get activities (founder or provider)
router.get("/:id/activities", getProposalActivities);
// Service provider: update proposal content (PENDING only)
router.put("/:id", updateProposal);

router.delete("/:id", withdrawProposal); // Withdraw proposal (service provider)

export default router;

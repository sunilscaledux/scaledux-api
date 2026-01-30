import { Router } from "express";
import {
  createProposal,
  getMyProposals,
  getProposalsByProject,
  getProposalById,
  updateProposalStatus,
  withdrawProposal,
  checkProposalStatus
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

// Status updates
router.put("/:id/status", updateProposalStatus); // Accept/reject proposal (founder)
router.delete("/:id", withdrawProposal); // Withdraw proposal (service provider)

export default router;

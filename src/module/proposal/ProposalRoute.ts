import { Router } from "express";
import {
  createProposal,
  saveDraftProposal,
  getMyProposals,
  getProposalsByProject,
  getFounderContracts,
  getProposalById,
  getProposalReasons,
  updateProposal,
  updateProposalStatus,
  setHire,
  cancelHire,
  declineOffer,
  terminateContract,
  restoreContract,
  markProjectCompleted,
  requestInvoice,
  updateProposalNda,
  withdrawProposal,
  checkProposalStatus,
  requestModify,
  getProposalActivities,
  addMilestone
} from "./ProposalController";
import { submitMilestone, requestChangesMilestone, approveMilestone, releaseMilestonePayment, rejectMilestone, deleteMilestone } from "./MilestoneController";
import { submitDeliverable, requestChangesDeliverable, approveDeliverable } from "./DeliverableController";
import { authenticateToken } from "@middleware/auth";
import { requireCompleteProfile } from "@middleware/requireCompleteProfile";
import { uploadFile } from "@module/general/FileController";
import { FileUpload, handleMulterError } from "@middleware/fileupload";

const router = Router();

router.use(authenticateToken);

router.post(
  "/upload-images",
  FileUpload({
    uploadPath: "proposals/attachments",
    fileFilter: "image",
    maxSize: 5,
    maxFiles: 5,
    fieldName: "proposal_attachments"
  }).array("files"),
  uploadFile,
  handleMulterError
);
 
router.post(
  "/upload-nda",
  FileUpload({
    uploadPath: "proposals/nda",
    fileFilter: "document",
    maxSize: 5,
    maxFiles: 1,
    fieldName: "proposal_nda"
  }).array("files"),
  uploadFile,
  handleMulterError
);

router.post(
  "/upload-milestone-document",
  FileUpload({
    uploadPath: "proposals/milestone-documents",
    fileFilter: "milestoneDeliverable",
    maxSize: 500,
    maxFiles: 1,
    fieldName: "proposal_milestone_document"
  }).array("files"),
  uploadFile,
  handleMulterError
);

// Service providers submitting a proposal (apply) must have a complete profile.
// Note: ProposalController.createProposal already runs its own completion
// check against MIN_PROFILE_COMPLETION_PERCENT; this middleware is a shorter
// 403 short-circuit for clients that want to bail out before hitting the
// controller's business logic.
router.post("/", requireCompleteProfile(), createProposal);
// Draft save — intentionally NOT gated by requireCompleteProfile so providers
// can stash progress before their profile is complete. The row is hidden
// from founder-facing queries until it's submitted.
router.post("/draft", saveDraftProposal);
router.get("/", getMyProposals);
router.get("/check/:projectId", checkProposalStatus);

router.get("/project/:projectId", getProposalsByProject);
router.get("/founder/contracts", getFounderContracts);

router.get("/reasons", getProposalReasons);

router.post("/milestones/:milestoneId/submit", submitMilestone);
router.post("/milestones/:milestoneId/request-changes", requestChangesMilestone);
router.post("/milestones/:milestoneId/approve", approveMilestone);
router.post("/milestones/:milestoneId/reject", rejectMilestone);
router.post("/milestones/:milestoneId/release-payment", releaseMilestonePayment);
router.delete("/milestones/:milestoneId", deleteMilestone);

router.post("/deliverables/:deliverableId/submit", submitDeliverable);
router.post("/deliverables/:deliverableId/request-changes", requestChangesDeliverable);
router.post("/deliverables/:deliverableId/approve", approveDeliverable);

router.post("/:id/milestones", addMilestone);

router.get("/:id", getProposalById);

router.put("/:id/status", updateProposalStatus);
// Founder hiring a service provider requires a complete founder profile.
router.post("/:id/hire", requireCompleteProfile(), setHire);
router.post("/:id/cancel-hire", cancelHire);
router.post("/:id/decline-offer", declineOffer);
router.post("/:id/terminate", terminateContract);
router.post("/:id/restore", restoreContract);
router.post("/:id/mark-project-completed", markProjectCompleted);
router.post("/:id/request-invoice", requestInvoice);
router.patch("/:id/nda", updateProposalNda);
router.post("/:id/request-modify", requestModify);
router.get("/:id/activities", getProposalActivities);
router.put("/:id", updateProposal);

router.delete("/:id", withdrawProposal);

export default router;

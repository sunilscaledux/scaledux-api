import { Router } from "express";
import {
  createProposal,
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

router.post("/", createProposal);
router.get("/", getMyProposals);
router.get("/check/:projectId", checkProposalStatus);

router.get("/project/:projectId", getProposalsByProject);
router.get("/founder/contracts", getFounderContracts);

router.get("/reasons", getProposalReasons);

router.post("/milestones/:milestoneId/submit", submitMilestone);
router.post("/milestones/:milestoneId/request-changes", requestChangesMilestone);
router.post("/milestones/:milestoneId/approve", approveMilestone);
router.post("/milestones/:milestoneId/release-payment", releaseMilestonePayment);

router.post("/deliverables/:deliverableId/submit", submitDeliverable);
router.post("/deliverables/:deliverableId/request-changes", requestChangesDeliverable);
router.post("/deliverables/:deliverableId/approve", approveDeliverable);

router.post("/:id/milestones", addMilestone);

router.get("/:id", getProposalById);

router.put("/:id/status", updateProposalStatus);
router.post("/:id/hire", setHire);
router.post("/:id/cancel-hire", cancelHire);
router.post("/:id/decline-offer", declineOffer);
router.post("/:id/terminate", terminateContract);
router.post("/:id/restore", restoreContract);
router.post("/:id/mark-project-completed", markProjectCompleted);
router.patch("/:id/nda", updateProposalNda);
router.post("/:id/request-modify", requestModify);
router.get("/:id/activities", getProposalActivities);
router.put("/:id", updateProposal);

router.delete("/:id", withdrawProposal);

export default router;

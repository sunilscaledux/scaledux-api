import { Router } from "express"
import {
  getCompanyProjects,
  getProjectById,
  createProject,
  saveDraft,
  updateProject,
  deleteProject,
  unpublishProject,
  duplicateProject,
  getMatchingServiceProviders,
  inviteProvider,
  revokeInvitation,
  acceptInvitation,
  rejectInvitation,
  toggleSaveProvider,
  toggleSaveProject,
  browseProjects
} from "./FounderProjectController"
import { uploadFile } from "@module/general/FileController"
import { authenticateToken, optionalAuth } from "@middleware/auth"
import { requireCompleteProfile } from "@middleware/requireCompleteProfile"
import { FileUpload, handleMulterError } from "@middleware/fileupload"

const router = Router()

router.get("/browse", optionalAuth, browseProjects)
router.get("/:id", optionalAuth, getProjectById)

router.use(authenticateToken)

router.get("/", getCompanyProjects)
router.post("/draft", saveDraft)
router.post("/", createProject)
router.put("/:id", updateProject)
router.post("/:id/unpublish", unpublishProject)
router.delete("/:id", deleteProject)

router.post(
  "/upload-files",
  FileUpload({ uploadPath: "founder-projects/files", fileFilter: "any", maxSize: 50, maxFiles: 10, fieldName: "founder_project_files" }).array("files"),
  uploadFile,
  handleMulterError
)

router.post("/:id/duplicate", duplicateProject)

router.get("/:id/matching-providers", getMatchingServiceProviders)
// Founder inviting a service provider requires a complete founder profile.
router.post("/:id/invite-provider", requireCompleteProfile(), inviteProvider)
router.post("/:id/revoke-invitation", revokeInvitation)
router.post("/:id/toggle-save-provider", toggleSaveProvider)

router.post("/:id/save", toggleSaveProject)
router.post("/:id/accept-invitation", acceptInvitation)
router.post("/:id/reject-invitation", rejectInvitation)

export default router

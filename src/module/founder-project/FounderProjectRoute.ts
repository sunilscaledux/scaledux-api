import { Router } from "express"
import {
  getCompanyProjects,
  getProjectById,
  createProject,
  saveDraft,
  updateProject,
  deleteProject,
  duplicateProject,
  getMatchingServiceProviders,
  inviteProvider,
  toggleSaveProvider,
  toggleSaveProject,
  browseProjects
} from "./FounderProjectController"
import { uploadFile } from "@module/general/FileController"
import { authenticateToken, optionalAuth } from "@middleware/auth"
import { FileUpload, handleMulterError } from "@middleware/fileupload"

const router = Router()

// Public/optional auth routes (before authenticateToken middleware)
router.get("/browse", optionalAuth, browseProjects)

// All routes below require authentication
router.use(authenticateToken)

// Founder Project CRUD routes
router.get("/", getCompanyProjects)
router.get("/:id", getProjectById) // Moved after auth to allow viewing drafts
router.post("/draft", saveDraft) // Draft route with minimal validation
router.post("/", createProject)
router.put("/:id", updateProject)
router.delete("/:id", deleteProject)

// Project file upload routes
router.post(
  "/upload-files",
  FileUpload({ uploadPath: "founder-projects/files", fileFilter: "any", maxSize: 50, maxFiles: 10 }).array("files"),
  uploadFile,
  handleMulterError
)

// Duplicate project
router.post("/:id/duplicate", duplicateProject)

// Service provider matching and invitation routes
router.get("/:id/matching-providers", getMatchingServiceProviders)
router.post("/:id/invite-provider", inviteProvider)
router.post("/:id/toggle-save-provider", toggleSaveProvider)

// Service provider save project for later
router.post("/:id/save", toggleSaveProject)

export default router

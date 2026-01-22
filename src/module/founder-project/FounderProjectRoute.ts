import { Router } from "express"
import {
  getCompanyProjects,
  getProjectById,
  createProject,
  saveDraft,
  updateProject,
  deleteProject,
  duplicateProject
} from "./FounderProjectController"
import { uploadFile } from "@module/general/FileController"
import { authenticateToken } from "@middleware/auth"
import { FileUpload, handleMulterError } from "@middleware/fileupload"

const router = Router()

// Public route - works with or without authentication
router.get("/:id", getProjectById)

// All routes below require authentication
router.use(authenticateToken)

// Founder Project CRUD routes
router.get("/", getCompanyProjects)
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

export default router

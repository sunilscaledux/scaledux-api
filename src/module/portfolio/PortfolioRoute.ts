import { Router } from "express"
import {
  getUserPortfolios,
  getPortfolioById,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  duplicatePortfolio,
  saveDraft,
  updateDraft
} from "./PortfolioController"
import { uploadFile } from "@module/general/FileController"
import { authenticateToken } from "@middleware/auth"
import { FileUpload, handleMulterError } from "@middleware/fileupload"

const router = Router()

// All routes require authentication
router.use(authenticateToken)

// Portfolio CRUD routes
router.get("/", getUserPortfolios)
router.get("/:id", getPortfolioById)
router.post("/", createPortfolio)
router.post("/draft", saveDraft) // Save as draft (relaxed validation)
router.put("/:id", updatePortfolio)
router.put("/:id/draft", updateDraft) // Update as draft (relaxed validation)
router.delete("/:id", deletePortfolio)

router.post(
  "/upload-thumbnail",
  FileUpload({ uploadPath: "portfolio/thumbnails", fileFilter: "image", maxSize: 10, maxFiles: 1, visibility: "public" }).array("thumbnail"),
  uploadFile,
  handleMulterError
)

router.post(
  "/upload-media",
  FileUpload({ uploadPath: "portfolio/media", fileFilter: "any", maxSize: 50, maxFiles: 10, visibility: "public" }).array("media"),
  uploadFile,
  handleMulterError
)

// Duplicate portfolio
router.post("/:id/duplicate", duplicatePortfolio)

export default router

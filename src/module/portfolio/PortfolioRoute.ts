import { Router } from "express"
import {
  getUserPortfolios,
  getPortfolioById,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  duplicatePortfolio
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
router.put("/:id", updatePortfolio)
router.delete("/:id", deletePortfolio)

// Portfolio file upload routes
router.post(
  "/upload-thumbnail",
  FileUpload({ uploadPath: "portfolio/thumbnails", fileFilter: "image", maxSize: 10, maxFiles: 1 }).array("thumbnail"),
  uploadFile,
  handleMulterError
)

router.post(
  "/upload-media",
  FileUpload({ uploadPath: "portfolio/media", fileFilter: "any", maxSize: 50, maxFiles: 10 }).array("media"),
  uploadFile,
  handleMulterError
)

// Portfolio file delete route - now handled by unified delete controller at /api/v1/files/delete-file

// Duplicate portfolio
router.post("/:id/duplicate", duplicatePortfolio)

export default router

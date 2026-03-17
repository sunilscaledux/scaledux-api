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
import { authenticateToken, optionalAuth } from "@middleware/auth"
import { FileUpload, handleMulterError } from "@middleware/fileupload"

const router = Router()

router.get("/:id", optionalAuth, getPortfolioById)

router.use(authenticateToken)

router.get("/", getUserPortfolios)
router.post("/", createPortfolio)
router.post("/draft", saveDraft)
router.put("/:id", updatePortfolio)
router.put("/:id/draft", updateDraft)
router.delete("/:id", deletePortfolio)

router.post(
  "/upload-thumbnail",
  FileUpload({ uploadPath: "portfolio/thumbnails", fileFilter: "image", maxSize: 10, maxFiles: 1, fieldName: "portfolio_thumbnail" }).array("thumbnail"),
  uploadFile,
  handleMulterError
)

router.post(
  "/upload-media",
  FileUpload({ uploadPath: "portfolio/media", fileFilter: "any", maxSize: 50, maxFiles: 10, fieldName: "portfolio_files" }).array("media"),
  uploadFile,
  handleMulterError
)

router.post("/:id/duplicate", duplicatePortfolio)

export default router

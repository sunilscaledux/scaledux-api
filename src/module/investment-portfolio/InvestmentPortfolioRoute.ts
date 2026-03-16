import { Router } from "express";
import {
  getUserInvestmentPortfolios,
  getInvestmentPortfolioById,
  getPublicInvestmentPortfolioById,
  createInvestmentPortfolio,
  updateInvestmentPortfolio,
  deleteInvestmentPortfolio,
  duplicateInvestmentPortfolio,
  saveDraft,
  updateDraft
} from "./InvestmentPortfolioController";
import { FileUpload, handleMulterError } from "@middleware/fileupload";
import { uploadFile } from "@module/general/FileController";
import { authenticateToken } from "@middleware/auth";

const router = Router();

// Public: get published investment portfolio by id (no auth)
router.get("/public/:id", getPublicInvestmentPortfolioById);

router.use(authenticateToken);

// CRUD
router.get("/", getUserInvestmentPortfolios);
router.get("/:id", getInvestmentPortfolioById);
router.post("/", createInvestmentPortfolio);
router.post("/draft", saveDraft);
router.put("/:id", updateInvestmentPortfolio);
router.put("/:id/draft", updateDraft);
router.delete("/:id", deleteInvestmentPortfolio);
router.post("/:id/duplicate", duplicateInvestmentPortfolio);

router.post(
  "/upload-logo",
  FileUpload({
    uploadPath: "investment-portfolio/logos",
    fileFilter: "image",
    maxSize: 10,
    maxFiles: 1,
    visibility: "public",
    useAttachment: true
  }).array("logo"),
  uploadFile,
  handleMulterError
);

export default router;

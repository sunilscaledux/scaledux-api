import { Router } from "express";
import {
  getUserInvestmentPortfolios,
  getInvestmentPortfolioById,
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

// Upload company logo
router.post(
  "/upload-logo",
  FileUpload({
    uploadPath: "investment-portfolio/logos",
    fileFilter: "image",
    maxSize: 10,
    maxFiles: 1
  }).array("logo"),
  uploadFile,
  handleMulterError
);

export default router;

import { Router } from "express"
import {
  getUserServicePackages,
  getServicePackageById,
  createServicePackage,
  updateServicePackage,
  deleteServicePackage,
  uploadServicePackageMedia,
  deleteServicePackageMedia
} from "./ServicePackageController"
import { authenticateToken } from "@middleware/auth"
import { FileUpload, handleMulterError } from "@middleware/fileupload"

const router = Router()

// All routes require authentication
router.use(authenticateToken)

// Service package CRUD routes
router.get("/", getUserServicePackages)
router.get("/:id", getServicePackageById)
router.post("/", createServicePackage)
router.put("/:id", updateServicePackage)
router.delete("/:id", deleteServicePackage)

// Service package media upload routes
router.post(
  "/upload-media",
  FileUpload({ 
    uploadPath: "service-packages/media", 
    fileFilter: "any", 
    maxSize: 50, 
    maxFiles: 10 
  }).array("media"),
  uploadServicePackageMedia,
  handleMulterError
)

// Service package media delete route
router.delete("/delete-media", deleteServicePackageMedia)

export default router

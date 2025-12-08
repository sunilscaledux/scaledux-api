import { Router } from "express"
import {
  getUserServicePackages,
  getServicePackageById,
  createServicePackage,
  updateServicePackage,
  deleteServicePackage,
  uploadServicePackageMedia,
  uploadServicePackageThumbnail,
  deleteServicePackageFile
} from "./ServicePackageController"
import { authenticateToken } from "@middleware/auth"
import { FileUpload, handleMulterError } from "@middleware/fileupload"

const router = Router()

// All routes require authentication
router.use(authenticateToken)

// Service package CRUD routes
router.get("/", getUserServicePackages)
router.post("/", createServicePackage)

// Specific routes MUST come before generic /:id routes
// Service package file delete route
router.delete("/delete-file", deleteServicePackageFile)

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

// Service package thumbnail upload route
router.post(
  "/upload-thumbnail",
  FileUpload({ 
    uploadPath: "service-packages/thumbnails", 
    fileFilter: "image", 
    maxSize: 10, 
    maxFiles: 5 
  }).array("thumbnail"),
  uploadServicePackageThumbnail,
  handleMulterError
)

// Generic /:id routes MUST come after specific routes
router.get("/:id", getServicePackageById)
router.put("/:id", updateServicePackage)
router.delete("/:id", deleteServicePackage)

export default router

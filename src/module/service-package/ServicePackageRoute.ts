import { Router } from "express"
import {
  getUserServicePackages,
  getServicePackageById,
  createServicePackage,
  updateServicePackage,
  deleteServicePackage
} from "./ServicePackageController"
import { uploadFile } from "@module/general/FileController"
import { authenticateToken } from "@middleware/auth"
import { FileUpload, handleMulterError } from "@middleware/fileupload"

const router = Router()

router.use(authenticateToken)

router.get("/", getUserServicePackages)
router.post("/", createServicePackage)

router.post(
  "/upload-media",
  FileUpload({
    uploadPath: "service-packages/media",
    fileFilter: "any",
    maxSize: 50,
    maxFiles: 10,
    fieldName: "service_package_media"
  }).array("media"),
  uploadFile,
  handleMulterError
)

router.post(
  "/upload-thumbnail",
  FileUpload({ uploadPath: "service-packages/thumbnails", fileFilter: "image", maxSize: 10, maxFiles: 1, fieldName: "service_package_thumbnail" }).array("thumbnail"),
  uploadFile,
  handleMulterError
)

router.get("/:id", getServicePackageById)
router.put("/:id", updateServicePackage)
router.delete("/:id", deleteServicePackage)

export default router

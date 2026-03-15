import { Router } from "express"
import { deleteFile, viewProtectedFile } from "./FileController"
import { authenticateToken } from "@middleware/auth"

const router = Router()

// Protected file view (must be before /delete-file so "view" is not captured as :uniqueId)
router.get("/view/:uniqueId", authenticateToken, viewProtectedFile)

// Unified file deletion route with authentication
router.delete("/delete-file", authenticateToken, deleteFile)

export default router

import { Router } from "express"
import { deleteFile } from "./FileController"
import { authenticateToken } from "@middleware/auth"

const router = Router()

// Unified file deletion route with authentication
router.delete("/delete-file", authenticateToken, deleteFile)

export default router

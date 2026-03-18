import { Router } from "express"
import { deleteFile } from "./FileController"
import { authenticateToken } from "@middleware/auth"

const router = Router()

router.delete("/delete-file", authenticateToken, deleteFile)

export default router

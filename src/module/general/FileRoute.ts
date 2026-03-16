import { Router } from "express"
import { deleteFile, viewProtectedFile } from "./FileController"
import { authenticateToken, privateFileAccess } from "@middleware/auth"

const router = Router()

router.get("/view/:uniqueId", privateFileAccess, viewProtectedFile)
router.delete("/delete-file", authenticateToken, deleteFile)

export default router

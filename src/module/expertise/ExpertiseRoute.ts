import { Router } from "express";
import { 
  createUserExpertise, 
  getUserExpertises, 
  updateUserExpertise, 
  deleteUserExpertise,
} from "./ExpertiseController";
import { authenticateToken } from "@middleware/auth";

const router = Router();

router.post("/", authenticateToken, createUserExpertise);
router.get("/", authenticateToken, getUserExpertises);
router.put("/:id", authenticateToken, updateUserExpertise);
router.delete("/:id", authenticateToken, deleteUserExpertise);

export default router;

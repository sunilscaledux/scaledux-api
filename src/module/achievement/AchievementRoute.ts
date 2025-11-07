import express from 'express'
import { authenticateToken } from '../../middleware/auth'
import { handleMulterError, FileUpload } from '../../middleware/fileupload'
import {
  getAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  uploadAchievementMedia
} from './AchievementController'

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// Achievement routes
router.get('/', getAchievements)
router.post('/', createAchievement)
router.put('/', updateAchievement)
router.delete('/:id', deleteAchievement)

// Media upload route
router.post(
  '/upload-media',
  FileUpload({ 
    uploadPath: 'achievements', 
    fileFilter: 'any', 
    maxSize: 10, 
    maxFiles: 5 
  }).array('media', 5),
  uploadAchievementMedia,
  handleMulterError
)

export default router

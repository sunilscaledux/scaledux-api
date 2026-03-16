import express from 'express'
import { authenticateToken } from '../../middleware/auth'
import { handleMulterError, FileUpload } from '../../middleware/fileupload'
import {
  getAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement
} from './AchievementController'
import { uploadFile } from '@module/general/FileController'

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// Achievement routes
router.get('/', getAchievements)
router.post('/', createAchievement)
router.put('/', updateAchievement)
router.delete('/:id', deleteAchievement)

router.post(
  '/upload-media',
  FileUpload({
    uploadPath: 'achievements',
    fileFilter: 'any',
    maxSize: 10,
    maxFiles: 5,
    visibility: 'public',
    useAttachment: true
  }).array('media', 5),
  uploadFile,
  handleMulterError
)

export default router

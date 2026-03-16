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

router.use(authenticateToken)

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
    fieldName: 'achievement_media'
  }).array('media', 5),
  uploadFile,
  handleMulterError
)

export default router

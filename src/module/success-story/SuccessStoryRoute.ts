import express from 'express'
import { authenticateToken } from '../../middleware/auth'
import { handleMulterError, FileUpload } from '../../middleware/fileupload'
import {
  getSuccessStories,
  createSuccessStory,
  updateSuccessStory,
  deleteSuccessStory
} from './SuccessStoryController'
import { uploadFile } from '@module/general/FileController'

const router = express.Router()

router.use(authenticateToken)

router.get('/', getSuccessStories)
router.post('/', createSuccessStory)
router.put('/', updateSuccessStory)
router.delete('/:id', deleteSuccessStory)

router.post(
  '/upload-media',
  FileUpload({
    uploadPath: 'success-stories',
    fileFilter: 'identityDocument',
    maxSize: 5,
    maxFiles: 5,
    fieldName: 'success_story_media'
  }).array('media', 5),
  uploadFile,
  handleMulterError
)

export default router

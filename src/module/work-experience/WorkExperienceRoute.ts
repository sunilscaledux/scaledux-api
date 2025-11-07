import { Router } from 'express'
import { authenticateToken } from '../../middleware/auth'
import { 
  getWorkExperiences, 
  createWorkExperience, 
  updateWorkExperience, 
  deleteWorkExperience 
} from './WorkExperienceController'

const router = Router()

// Apply authentication middleware to all routes
router.use(authenticateToken)

// Work experience routes
router.get('/', getWorkExperiences)
router.post('/', createWorkExperience)
router.put('/', updateWorkExperience)
router.delete('/:id', deleteWorkExperience)

export default router

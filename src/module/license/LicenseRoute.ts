import { Router } from 'express'
import { getLicenses, createLicense, updateLicense, deleteLicense } from './LicenseController'
import { authenticateToken } from '../../middleware/auth'

const router = Router()

router.use(authenticateToken)

router.get('/', getLicenses)
router.post('/', createLicense)
router.put('/', updateLicense)
router.delete('/:id', deleteLicense)

export default router

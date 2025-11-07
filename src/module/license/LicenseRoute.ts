import { Router } from 'express'
import { getLicenses, createLicense, updateLicense, deleteLicense } from './LicenseController'
import { authenticateToken } from '../../middleware/auth'

const router = Router()

// All license routes require authentication
router.use(authenticateToken)

// GET /api/v1/licenses - Get all licenses for authenticated user
router.get('/', getLicenses)

// POST /api/v1/licenses - Create a new license
router.post('/', createLicense)

// PUT /api/v1/licenses - Update a license
router.put('/', updateLicense)

// DELETE /api/v1/licenses/:id - Delete a license
router.delete('/:id', deleteLicense)

export default router

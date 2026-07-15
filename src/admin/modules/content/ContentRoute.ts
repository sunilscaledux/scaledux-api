import { Router } from 'express';
import * as C from './ContentController';
import { requireAdmin, requirePermission } from '@admin/middleware/auth';
import { PERMISSIONS } from '@admin/constants/permissions';

const router = Router();

router.use(requireAdmin);

const view = requirePermission(PERMISSIONS.CONTENT_VIEW);
const manage = requirePermission(PERMISSIONS.CONTENT_MANAGE);

// Categories
router.get('/categories', view, C.listCategories);
router.post('/categories', manage, C.createCategory);
router.patch('/categories/:id', manage, C.updateCategory);

// Subcategories
router.get('/subcategories', view, C.listSubcategories);
router.post('/subcategories', manage, C.createSubcategory);
router.patch('/subcategories/:id', manage, C.updateSubcategory);

// Skills
router.get('/skills', view, C.listSkills);
router.post('/skills', manage, C.createSkill);
router.patch('/skills/:id', manage, C.updateSkill);

// Industries
router.get('/industries', view, C.listIndustries);
router.post('/industries', manage, C.createIndustry);
router.patch('/industries/:id', manage, C.updateIndustry);

// Sub-industries
router.get('/sub-industries', view, C.listSubIndustries);
router.post('/sub-industries', manage, C.createSubIndustry);
router.patch('/sub-industries/:id', manage, C.updateSubIndustry);

// Business models
router.get('/business-models', view, C.listBusinessModels);
router.post('/business-models', manage, C.createBusinessModel);
router.patch('/business-models/:id', manage, C.updateBusinessModel);

// Countries
router.get('/countries', view, C.listCountries);
router.post('/countries', manage, C.createCountry);
router.patch('/countries/:id', manage, C.updateCountry);

export default router;

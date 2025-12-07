import { Router } from 'express'
import { ServiceCategoryController } from '../controllers/ServiceCategoryController'

const router = Router()

// Get all categories
router.get('/categories', ServiceCategoryController.getCategories)

// Get category details with subcategories and keywords
router.get('/categories/:categoryId', ServiceCategoryController.getCategoryDetails)

// Get subcategories by category ID
router.get('/categories/:categoryId/subcategories', ServiceCategoryController.getSubCategories)

// Get keywords by category ID (not subcategory - as per requirement)
router.get('/categories/:categoryId/keywords', ServiceCategoryController.getKeywordsByCategory)

// Search keywords within a category
router.get('/categories/:categoryId/keywords/search', ServiceCategoryController.searchKeywords)

export default router

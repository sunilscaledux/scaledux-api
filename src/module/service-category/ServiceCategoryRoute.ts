import { Router } from "express"
import {
  getServiceCategories,
  getSubCategoriesByCategory,
  getKeywordsByCategory,
  searchKeywords,
  getPopularKeywords,
  getCategoriesWithSubCategories
} from "./ServiceCategoryController"

const router = Router()

router.get("/categories", getServiceCategories)
router.get("/categories-with-subcategories", getCategoriesWithSubCategories)
router.get("/categories/:categoryId/subcategories", getSubCategoriesByCategory)
router.get("/categories/:categoryId/keywords", getKeywordsByCategory)
router.get("/categories/:categoryId/keywords/popular", getPopularKeywords)
router.get("/keywords/search", searchKeywords)

export default router

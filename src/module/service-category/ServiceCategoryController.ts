import { Request, Response } from 'express'
import { ServiceCategoryService } from './ServiceCategoryService'
import { ApiResponse } from '@utils/ApiResponse'

/**
 * Get all service categories
 */
export async function getServiceCategories(req: Request, res: Response) {
  const result = await ServiceCategoryService.getServiceCategories()

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message)
  } else {
    return ApiResponse.error(res, result.message)
  }
}

/**
 * Get subcategories by category ID
 */
export async function getSubCategoriesByCategory(req: Request, res: Response) {
  const { categoryId } = req.params

  if (!categoryId) {
    return ApiResponse.error(res, "Category ID is required", 400)
  }

  const result = await ServiceCategoryService.getSubCategoriesByCategory(parseInt(categoryId))

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message)
  } else {
    return ApiResponse.error(res, result.message)
  }
}

/**
 * Get keywords by category ID with pagination and search
 */
export async function getKeywordsByCategory(req: Request, res: Response) {
  const { categoryId } = req.params
  const { 
    page = '1', 
    limit = '50', 
    search = '', 
    subCategoryId 
  } = req.query

  if (!categoryId) {
    return ApiResponse.error(res, "Category ID is required", 400)
  }

  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const searchStr = search as string
  const subCatId = subCategoryId ? parseInt(subCategoryId as string) : undefined

  const result = await ServiceCategoryService.getKeywordsByCategory(
    parseInt(categoryId),
    pageNum,
    limitNum,
    searchStr || undefined,
    subCatId
  )

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message)
  } else {
    return ApiResponse.error(res, result.message)
  }
}

/**
 * Search keywords across all categories
 */
export async function searchKeywords(req: Request, res: Response) {
  const { 
    q: search = '', 
    limit = '20',
    categoryId,
    subCategoryId 
  } = req.query

  const searchStr = search as string
  const limitNum = parseInt(limit as string)
  const catId = categoryId ? parseInt(categoryId as string) : undefined
  const subCatId = subCategoryId ? parseInt(subCategoryId as string) : undefined

  const result = await ServiceCategoryService.searchKeywords(
    searchStr,
    limitNum,
    catId,
    subCatId
  )

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message)
  } else {
    return ApiResponse.error(res, result.message, 400)
  }
}

/**
 * Get popular keywords by category (for suggestions)
 */
export async function getPopularKeywords(req: Request, res: Response) {
  const { categoryId } = req.params
  const { limit = '10' } = req.query

  if (!categoryId) {
    return ApiResponse.error(res, "Category ID is required", 400)
  }

  const limitNum = parseInt(limit as string)
  const result = await ServiceCategoryService.getPopularKeywords(parseInt(categoryId), limitNum)

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message)
  } else {
    return ApiResponse.error(res, result.message)
  }
}

/**
 * Get categories with their subcategories (nested structure)
 */
export async function getCategoriesWithSubCategories(req: Request, res: Response) {
  const result = await ServiceCategoryService.getCategoriesWithSubCategories()

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message)
  } else {
    return ApiResponse.error(res, result.message)
  }
}

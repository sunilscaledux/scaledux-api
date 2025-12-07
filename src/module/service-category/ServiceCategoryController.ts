import { Request, Response } from 'express'
import { prisma } from '@config/prisma'
import { ApiResponse } from '@utils/ApiResponse'

/**
 * Get all service categories
 */
export async function getServiceCategories(req: Request, res: Response) {
  try {
    const categories = await prisma.serviceCategory.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            subCategories: true,
            keywords: true
          }
        }
      }
    })

    return ApiResponse.success(res, categories, "Service categories retrieved successfully")

  } catch (error: any) {
    console.error("Get Service Categories Error:", error)
    return ApiResponse.error(res, "Failed to get service categories")
  }
}

/**
 * Get subcategories by category ID
 */
export async function getSubCategoriesByCategory(req: Request, res: Response) {
  try {
    const { categoryId } = req.params

    if (!categoryId) {
      return ApiResponse.error(res, "Category ID is required", 400)
    }

    const subCategories = await prisma.serviceSubCategory.findMany({
      where: { 
        category_id: parseInt(categoryId),
        is_active: true 
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            keywords: true
          }
        }
      }
    })

    return ApiResponse.success(res, subCategories, "Subcategories retrieved successfully")

  } catch (error: any) {
    console.error("Get SubCategories Error:", error)
    return ApiResponse.error(res, "Failed to get subcategories")
  }
}

/**
 * Get keywords by category ID with pagination and search
 */
export async function getKeywordsByCategory(req: Request, res: Response) {
  try {
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
    const offset = (pageNum - 1) * limitNum

    // Build where condition
    const whereCondition: any = {
      category_id: parseInt(categoryId),
      is_active: true
    }

    // Add subcategory filter if provided
    if (subCategoryId) {
      whereCondition.sub_category_id = parseInt(subCategoryId as string)
    }

    // Add search filter if provided
    if (search) {
      whereCondition.name = {
        contains: search as string,
        mode: 'insensitive'
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.serviceKeyword.count({
      where: whereCondition
    })

    // Get keywords with pagination
    const keywords = await prisma.serviceKeyword.findMany({
      where: whereCondition,
      orderBy: [
        { popularity_score: 'desc' }, // Popular keywords first
        { name: 'asc' }
      ],
      skip: offset,
      take: limitNum,
      include: {
        subCategory: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    const totalPages = Math.ceil(totalCount / limitNum)
    const hasNextPage = pageNum < totalPages
    const hasPrevPage = pageNum > 1

    const response = {
      keywords,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit: limitNum
      }
    }

    return ApiResponse.success(res, response, "Keywords retrieved successfully")

  } catch (error: any) {
    console.error("Get Keywords Error:", error)
    return ApiResponse.error(res, "Failed to get keywords")
  }
}

/**
 * Search keywords across all categories
 */
export async function searchKeywords(req: Request, res: Response) {
  try {
    const { 
      q: search = '', 
      limit = '20',
      categoryId,
      subCategoryId 
    } = req.query

    if (!search || (search as string).length < 2) {
      return ApiResponse.error(res, "Search query must be at least 2 characters", 400)
    }

    const limitNum = parseInt(limit as string)

    // Build where condition
    const whereCondition: any = {
      is_active: true,
      name: {
        contains: search as string,
        mode: 'insensitive'
      }
    }

    // Add category filter if provided
    if (categoryId) {
      whereCondition.category_id = parseInt(categoryId as string)
    }

    // Add subcategory filter if provided
    if (subCategoryId) {
      whereCondition.sub_category_id = parseInt(subCategoryId as string)
    }

    const keywords = await prisma.serviceKeyword.findMany({
      where: whereCondition,
      orderBy: [
        { popularity_score: 'desc' },
        { name: 'asc' }
      ],
      take: limitNum,
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        subCategory: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return ApiResponse.success(res, keywords, "Keywords search completed successfully")

  } catch (error: any) {
    console.error("Search Keywords Error:", error)
    return ApiResponse.error(res, "Failed to search keywords")
  }
}

/**
 * Get popular keywords by category (for suggestions)
 */
export async function getPopularKeywords(req: Request, res: Response) {
  try {
    const { categoryId } = req.params
    const { limit = '10' } = req.query

    if (!categoryId) {
      return ApiResponse.error(res, "Category ID is required", 400)
    }

    const limitNum = parseInt(limit as string)

    const keywords = await prisma.serviceKeyword.findMany({
      where: { 
        category_id: parseInt(categoryId),
        is_active: true,
        popularity_score: {
          gte: 1 // Only keywords with some popularity
        }
      },
      orderBy: { popularity_score: 'desc' },
      take: limitNum,
      select: {
        id: true,
        name: true,
        popularity_score: true
      }
    })

    return ApiResponse.success(res, keywords, "Popular keywords retrieved successfully")

  } catch (error: any) {
    console.error("Get Popular Keywords Error:", error)
    return ApiResponse.error(res, "Failed to get popular keywords")
  }
}

/**
 * Get categories with their subcategories (nested structure)
 */
export async function getCategoriesWithSubCategories(req: Request, res: Response) {
  try {
    const categories = await prisma.serviceCategory.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      include: {
        subCategories: {
          where: { is_active: true },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    })

    return ApiResponse.success(res, categories, "Categories with subcategories retrieved successfully")

  } catch (error: any) {
    console.error("Get Categories with SubCategories Error:", error)
    return ApiResponse.error(res, "Failed to get categories with subcategories")
  }
}

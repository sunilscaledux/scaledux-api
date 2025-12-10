import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";

export class ServiceCategoryService {
  /**
   * Get all service categories
   */
  static async getServiceCategories(): Promise<ServiceResponse> {
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
      });

      return {
        success: true,
        message: "Service categories retrieved successfully",
        data: categories
      };
    } catch (error: any) {
      console.error("Get Service Categories Error:", error);
      return {
        success: false,
        message: "Failed to get service categories"
      };
    }
  }

  /**
   * Get subcategories by category ID
   */
  static async getSubCategoriesByCategory(categoryId: number): Promise<ServiceResponse> {
    try {
      const subCategories = await prisma.serviceSubCategory.findMany({
        where: { 
          category_id: categoryId,
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
      });

      return {
        success: true,
        message: "Subcategories retrieved successfully",
        data: subCategories
      };
    } catch (error: any) {
      console.error("Get SubCategories Error:", error);
      return {
        success: false,
        message: "Failed to get subcategories"
      };
    }
  }

  /**
   * Get keywords by category ID with pagination and search
   */
  static async getKeywordsByCategory(
    categoryId: number,
    page: number = 1,
    limit: number = 50,
    search?: string,
    subCategoryId?: number
  ): Promise<ServiceResponse> {
    try {
      const offset = (page - 1) * limit;

      // Build where condition
      const whereCondition: any = {
        category_id: categoryId,
        is_active: true
      };

      // Add subcategory filter if provided
      if (subCategoryId) {
        whereCondition.sub_category_id = subCategoryId;
      }

      // Add search filter if provided
      if (search) {
        whereCondition.name = {
          contains: search,
          mode: 'insensitive'
        };
      }

      // Get total count for pagination
      const totalCount = await prisma.serviceKeyword.count({
        where: whereCondition
      });

      // Get keywords with pagination
      const keywords = await prisma.serviceKeyword.findMany({
        where: whereCondition,
        orderBy: [
          { popularity_score: 'desc' }, // Popular keywords first
          { name: 'asc' }
        ],
        skip: offset,
        take: limit,
        include: {
          subCategory: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      const response = {
        keywords,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit
        }
      };

      return {
        success: true,
        message: "Keywords retrieved successfully",
        data: response
      };
    } catch (error: any) {
      console.error("Get Keywords Error:", error);
      return {
        success: false,
        message: "Failed to get keywords"
      };
    }
  }

  /**
   * Search keywords across all categories
   */
  static async searchKeywords(
    search: string,
    limit: number = 20,
    categoryId?: number,
    subCategoryId?: number
  ): Promise<ServiceResponse> {
    try {
      if (!search || search.length < 2) {
        return {
          success: false,
          message: "Search query must be at least 2 characters"
        };
      }

      // Build where condition
      const whereCondition: any = {
        is_active: true,
        name: {
          contains: search,
          mode: 'insensitive'
        }
      };

      // Add category filter if provided
      if (categoryId) {
        whereCondition.category_id = categoryId;
      }

      // Add subcategory filter if provided
      if (subCategoryId) {
        whereCondition.sub_category_id = subCategoryId;
      }

      const keywords = await prisma.serviceKeyword.findMany({
        where: whereCondition,
        orderBy: [
          { popularity_score: 'desc' },
          { name: 'asc' }
        ],
        take: limit,
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
      });

      return {
        success: true,
        message: "Keywords search completed successfully",
        data: keywords
      };
    } catch (error: any) {
      console.error("Search Keywords Error:", error);
      return {
        success: false,
        message: "Failed to search keywords"
      };
    }
  }

  /**
   * Get popular keywords by category (for suggestions)
   */
  static async getPopularKeywords(categoryId: number, limit: number = 10): Promise<ServiceResponse> {
    try {
      const keywords = await prisma.serviceKeyword.findMany({
        where: { 
          category_id: categoryId,
          is_active: true,
          popularity_score: {
            gte: 1 // Only keywords with some popularity
          }
        },
        orderBy: { popularity_score: 'desc' },
        take: limit,
        select: {
          id: true,
          name: true,
          popularity_score: true
        }
      });

      return {
        success: true,
        message: "Popular keywords retrieved successfully",
        data: keywords
      };
    } catch (error: any) {
      console.error("Get Popular Keywords Error:", error);
      return {
        success: false,
        message: "Failed to get popular keywords"
      };
    }
  }

  /**
   * Get categories with their subcategories (nested structure)
   */
  static async getCategoriesWithSubCategories(): Promise<ServiceResponse> {
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
      });

      return {
        success: true,
        message: "Categories with subcategories retrieved successfully",
        data: categories
      };
    } catch (error: any) {
      console.error("Get Categories with SubCategories Error:", error);
      return {
        success: false,
        message: "Failed to get categories with subcategories"
      };
    }
  }
}

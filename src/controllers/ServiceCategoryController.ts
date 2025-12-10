import { Request, Response } from 'express'
import { prisma } from '../services/prismaService'

export class ServiceCategoryController {
  // Get all active categories
  static async getCategories(req: Request, res: Response) {
    try {
      const categories = await prisma.serviceCategory.findMany({
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          description: true,
          icon: true
        },
        orderBy: { name: 'asc' }
      })

      res.json({
        success: true,
        data: categories
      })
    } catch (error) {
      console.error('Error fetching categories:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories'
      })
    }
  }

  // Get subcategories by category ID
  static async getSubCategories(req: Request, res: Response) {
    try {
      const { categoryId } = req.params

      if (!categoryId) {
        return res.status(400).json({
          success: false,
          message: 'Category ID is required'
        })
      }

      const subCategories = await prisma.serviceSubCategory.findMany({
        where: {
          category_id: parseInt(categoryId),
          is_active: true
        },
        select: {
          id: true,
          name: true,
          description: true
        },
        orderBy: { name: 'asc' }
      })

      res.json({
        success: true,
        data: subCategories
      })
    } catch (error) {
      console.error('Error fetching subcategories:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subcategories'
      })
    }
  }

  // Get keywords by category ID (not subcategory)
  static async getKeywordsByCategory(req: Request, res: Response) {
    try {
      const { categoryId } = req.params

      if (!categoryId) {
        return res.status(400).json({
          success: false,
          message: 'Category ID is required'
        })
      }

      const keywords = await prisma.serviceKeyword.findMany({
        where: {
          category_id: parseInt(categoryId),
          is_active: true
        },
        select: {
          id: true,
          name: true,
          popularity_score: true
        },
        orderBy: [
          { popularity_score: 'desc' },
          { name: 'asc' }
        ]
      })

      res.json({
        success: true,
        data: keywords
      })
    } catch (error) {
      console.error('Error fetching keywords:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to fetch keywords'
      })
    }
  }

  // Get category with its subcategories and keywords
  static async getCategoryDetails(req: Request, res: Response) {
    try {
      const { categoryId } = req.params

      if (!categoryId) {
        return res.status(400).json({
          success: false,
          message: 'Category ID is required'
        })
      }

      const category = await prisma.serviceCategory.findUnique({
        where: {
          id: parseInt(categoryId),
          is_active: true
        },
        include: {
          subCategories: {
            where: { is_active: true },
            select: {
              id: true,
              name: true,
              description: true
            },
            orderBy: { name: 'asc' }
          },
          keywords: {
            where: { is_active: true },
            select: {
              id: true,
              name: true,
              popularity_score: true
            },
            orderBy: [
              { popularity_score: 'desc' },
              { name: 'asc' }
            ]
          }
        }
      })

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        })
      }

      res.json({
        success: true,
        data: category
      })
    } catch (error) {
      console.error('Error fetching category details:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category details'
      })
    }
  }

  // Search keywords by name within a category
  static async searchKeywords(req: Request, res: Response) {
    try {
      const { categoryId } = req.params
      const { q } = req.query

      if (!categoryId) {
        return res.status(400).json({
          success: false,
          message: 'Category ID is required'
        })
      }

      const searchTerm = q as string || ''

      const keywords = await prisma.serviceKeyword.findMany({
        where: {
          category_id: parseInt(categoryId),
          is_active: true,
          name: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          name: true,
          popularity_score: true
        },
        orderBy: [
          { popularity_score: 'desc' },
          { name: 'asc' }
        ],
        take: 20 // Limit results for performance
      })

      res.json({
        success: true,
        data: keywords
      })
    } catch (error) {
      console.error('Error searching keywords:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to search keywords'
      })
    }
  }
}

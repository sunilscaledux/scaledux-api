import { Request, Response } from 'express'
import { prisma } from "../../services/prismaService";
import { ApiResponse } from '@utils/ApiResponse'
import { getRelativePath, getFileUrl, extractRelativePath } from '@utils/General'
import { 
  createPortfolioSchema, 
  updatePortfolioSchema, 
  createDraftPortfolioSchema, 
  updateDraftPortfolioSchema 
} from './PortfolioValidation'
import { CreatePortfolioInput, UpdatePortfolioInput } from './PortfolioType'
import fs from 'fs'
import path from 'path'

/**
 * Get all portfolios for the authenticated user
 */
export async function getUserPortfolios(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const { status } = req.query // 'DRAFT' or 'PUBLISHED'

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    const whereClause: any = { user_id: userId }
    if (status) {
      whereClause.status = status
    }

    const portfolios = await prisma.portfolio.findMany({
      where: {
        ...whereClause,
        deleted_at: null // Only get non-deleted portfolios
      },
      include: {
        industry: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    // Transform URLs to full URLs
    const transformedPortfolios = portfolios.map(portfolio => ({
      ...portfolio,
      thumbnail_urls: portfolio.thumbnail_urls 
        ? (portfolio.thumbnail_urls as string[]).map((url: string) => getFileUrl(url))
        : [],
      media_urls: portfolio.media_urls
        ? (portfolio.media_urls as string[]).map((url: string) => getFileUrl(url))
        : []
    }))

    return ApiResponse.success(res, transformedPortfolios, "Portfolios retrieved successfully")

  } catch (error: any) {
    console.error("Get User Portfolios Error:", error)
    return ApiResponse.error(res, "Failed to get portfolios")
  }
}

/**
 * Get a single portfolio by ID (unique_id)
 */
export async function getPortfolioById(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const { id } = req.params // This is unique_id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    const portfolio = await prisma.portfolio.findFirst({
      where: { 
        unique_id: id,
        user_id: userId,
        deleted_at: null // Only get non-deleted portfolio
      },
      include: {
        industry: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    })

    if (!portfolio) {
      return ApiResponse.error(res, "Portfolio not found", 404)
    }

    // Transform URLs to full URLs
    const transformedPortfolio = {
      ...portfolio,
      thumbnail_urls: portfolio.thumbnail_urls 
        ? (portfolio.thumbnail_urls as string[]).map((url: string) => getFileUrl(url))
        : [],
      media_urls: portfolio.media_urls
        ? (portfolio.media_urls as string[]).map((url: string) => getFileUrl(url))
        : []
    }

    return ApiResponse.success(res, transformedPortfolio, "Portfolio retrieved successfully")

  } catch (error: any) {
    console.error("Get Portfolio Error:", error)
    return ApiResponse.error(res, "Failed to get portfolio")
  }
}

/**
 * Create a new portfolio
 */
export async function createPortfolio(req: Request, res: Response) {
  try {
    const userId = req.user?.id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    // Choose validation schema based on status
    const isDraft = req.body.status === 'DRAFT'
    const schema = isDraft ? createDraftPortfolioSchema : createPortfolioSchema
    
    // Validate request body
    const { error, value } = schema.validate(req.body)

    if (error) {
      return ApiResponse.error(res, error.details[0].message, 400)
    }

    const portfolioData: CreatePortfolioInput = value

    const portfolio = await prisma.portfolio.create({
      data: {
        user_id: userId,
        title: portfolioData.title,
        description: portfolioData.description,
        company_name: portfolioData.companyName,
        hide_company_name: portfolioData.hideCompanyName || false,
        industry_id: portfolioData.industryId,
        role: portfolioData.role || '',
        project_skills: (portfolioData.projectSkills || []) as any,
        thumbnail_urls: JSON.stringify((portfolioData.thumbnail || []).map(extractRelativePath)),
        media_urls: JSON.stringify((portfolioData.media || []).map(extractRelativePath)),
        project_link: portfolioData.projectLink || null,
        completion_month: portfolioData.completionMonth || '',
        completion_year: portfolioData.completionYear || '',
        references: (portfolioData.references || []) as any,
        status: portfolioData.status || 'DRAFT'
      }
    })

    // Different success message based on status
    const successMessage = portfolioData.status === 'DRAFT' 
      ? "Portfolio drafted successfully" 
      : "Portfolio created successfully"
    
    return ApiResponse.success(res, portfolio, successMessage, 201)

  } catch (error: any) {
    console.error("Create Portfolio Error:", error)
    return ApiResponse.error(res, "Failed to create portfolio")
  }
}

/**
 * Update an existing portfolio
 */
export async function updatePortfolio(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const { id } = req.params // This is unique_id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    // Choose validation schema based on status
    const isDraft = req.body.status === 'DRAFT'
    const schema = isDraft ? updateDraftPortfolioSchema : updatePortfolioSchema
    
    // Validate request body
    const { error, value } = schema.validate(req.body)

    if (error) {
      return ApiResponse.error(res, error.details[0].message, 400)
    }

    const portfolioData: UpdatePortfolioInput = value

    // Check if portfolio exists and belongs to user
    const existingPortfolio = await prisma.portfolio.findFirst({
      where: { 
        unique_id: id,
        user_id: userId,
        deleted_at: null // Only get non-deleted portfolio
      }
    })

    if (!existingPortfolio) {
      return ApiResponse.error(res, "Portfolio not found", 404)
    }

    const portfolio = await prisma.portfolio.update({
      where: { id: existingPortfolio.id }, // Use internal ID for update
      data: {
        title: portfolioData.title || existingPortfolio.title,
        description: portfolioData.description || existingPortfolio.description,
        company_name: portfolioData.companyName || existingPortfolio.company_name,
        hide_company_name: portfolioData.hideCompanyName !== undefined ? portfolioData.hideCompanyName : existingPortfolio.hide_company_name,
        industry_id: portfolioData.industryId || existingPortfolio.industry_id,
        role: portfolioData.role || existingPortfolio.role,
        project_skills: portfolioData.projectSkills ? portfolioData.projectSkills as any : existingPortfolio.project_skills,
        thumbnail_urls: portfolioData.thumbnail !== undefined ? JSON.stringify((portfolioData.thumbnail || []).map(extractRelativePath)) as any : existingPortfolio.thumbnail_urls,
        media_urls: portfolioData.media !== undefined ? JSON.stringify((portfolioData.media || []).map(extractRelativePath)) as any : existingPortfolio.media_urls,
        project_link: portfolioData.projectLink !== undefined ? portfolioData.projectLink : existingPortfolio.project_link,
        completion_month: portfolioData.completionMonth || existingPortfolio.completion_month,
        completion_year: portfolioData.completionYear || existingPortfolio.completion_year,
        references: portfolioData.references !== undefined ? portfolioData.references as any : existingPortfolio.references,
        status: portfolioData.status || existingPortfolio.status
      }
    })

    // Different success message based on status
    const successMessage = (portfolioData.status || existingPortfolio.status) === 'DRAFT' 
      ? "Portfolio drafted successfully" 
      : "Portfolio updated successfully"
    
    return ApiResponse.success(res, portfolio, successMessage)

  } catch (error: any) {
    console.error("Update Portfolio Error:", error)
    return ApiResponse.error(res, "Failed to update portfolio")
  }
}

/**
 * Delete a portfolio
 */
export async function deletePortfolio(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const { id } = req.params // This is unique_id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    // Check if portfolio exists and belongs to user
    const portfolio = await prisma.portfolio.findFirst({
      where: { 
        unique_id: id,
        user_id: userId,
        deleted_at: null // Only get non-deleted portfolio
      }
    })

    if (!portfolio) {
      return ApiResponse.error(res, "Portfolio not found", 404)
    }

    // Soft delete - set deleted_at timestamp
    const deletedPortfolio = await prisma.portfolio.update({
      where: { id: portfolio.id },
      data: {
        deleted_at: new Date()
      }
    })

    return ApiResponse.success(res, { deleted_at: deletedPortfolio.deleted_at }, "Portfolio deleted successfully")

  } catch (error: any) {
    console.error("Delete Portfolio Error:", error)
    return ApiResponse.error(res, "Failed to delete portfolio")
  }
}


/**
 * Upload portfolio thumbnail
 */
export async function uploadThumbnail(req: Request, res: Response) {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return ApiResponse.error(res, "No files uploaded", 400)
    }

    const userId = req.user?.id
    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    const thumbnailPaths = req.files.map((file: any) => getRelativePath(file.path))
    const thumbnailUrls = thumbnailPaths.map((path: string) => getFileUrl(path))

    return ApiResponse.success(
      res,
      { 
        thumbnailPaths,  // Relative paths for storage
        thumbnailUrls    // Full URLs for immediate display
      },
      "Thumbnail uploaded successfully"
    )
  } catch (error: any) {
    console.error("Error uploading thumbnail:", error)
    return ApiResponse.error(res, "Failed to upload thumbnail", 500)
  }
}

/**
 * Upload portfolio media files
 */
export async function uploadMedia(req: Request, res: Response) {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return ApiResponse.error(res, "No files uploaded", 400)
    }

    const userId = req.user?.id
    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    const mediaPaths = req.files.map((file: any) => getRelativePath(file.path))
    const mediaUrls = mediaPaths.map((path: string) => getFileUrl(path))

    return ApiResponse.success(
      res,
      { 
        mediaPaths,  // Relative paths for storage
        mediaUrls    // Full URLs for immediate display
      },
      "Media files uploaded successfully"
    )
  } catch (error: any) {
    console.error("Error uploading media:", error)
    return ApiResponse.error(res, "Failed to upload media files", 500)
  }
}

/**
 * Delete portfolio file (thumbnail or media)
 */
export async function deletePortfolioFile(req: Request, res: Response) {
  try {
    const { filePath } = req.body
    const userId = req.user?.id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    if (!filePath) {
      return ApiResponse.error(res, "File path is required", 400)
    }

    const fullPath = path.join(process.cwd(), filePath)

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }

    return ApiResponse.success(
      res,
      { deletedPath: filePath },
      "File deleted successfully"
    )
  } catch (error: any) {
    console.error("Error deleting file:", error)
    return ApiResponse.error(res, "Failed to delete file", 500)
  }
}

/**
 * Duplicate a portfolio
 */
export async function duplicatePortfolio(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const { id } = req.params // This is unique_id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    const originalPortfolio = await prisma.portfolio.findFirst({
      where: { 
        unique_id: id,
        user_id: userId,
        deleted_at: null // Only get non-deleted portfolio
      }
    })

    if (!originalPortfolio) {
      return ApiResponse.error(res, "Portfolio not found", 404)
    }

    const duplicatedPortfolio = await prisma.portfolio.create({
      data: {
        user_id: userId,
        title: `${originalPortfolio.title} (Copy)`,
        description: originalPortfolio.description,
        company_name: originalPortfolio.company_name,
        hide_company_name: originalPortfolio.hide_company_name,
        industry_id: originalPortfolio.industry_id,
        role: originalPortfolio.role,
        project_skills: originalPortfolio.project_skills as any,
        thumbnail_urls: originalPortfolio.thumbnail_urls as any,
        media_urls: originalPortfolio.media_urls as any,
        project_link: originalPortfolio.project_link,
        completion_month: originalPortfolio.completion_month,
        completion_year: originalPortfolio.completion_year,
        references: originalPortfolio.references as any,
        status: originalPortfolio.status // Preserve original status (PUBLISHED stays PUBLISHED)
      }
    })

    return ApiResponse.success(res, duplicatedPortfolio, "Portfolio duplicated successfully", 201)

  } catch (error: any) {
    console.error("Duplicate Portfolio Error:", error)
    return ApiResponse.error(res, "Failed to duplicate portfolio")
  }
}

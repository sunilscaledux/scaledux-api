import { prisma } from "@services/prismaService";
import { CreatePortfolioInput, UpdatePortfolioInput } from "./PortfolioType";
import { ServiceResponse } from "@utils/ApiResponse";
import { getRelativePath, getFileUrl, extractRelativePath } from '@utils/General';
import { ulid } from 'ulid';
import fs from 'fs';
import path from 'path';

export class PortfolioService {
  /**
   * Get all portfolios for a user
   */
  static async getUserPortfolios(userId: number, status?: string): Promise<ServiceResponse> {
    try {
      const whereClause: any = { user_id: userId };
      if (status) {
        whereClause.status = status;
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
      });

      // Transform URLs to full URLs
      const transformedPortfolios = portfolios.map(portfolio => ({
        ...portfolio,
        thumbnail_urls: portfolio.thumbnail_urls 
          ? (portfolio.thumbnail_urls as string[]).map((url: string) => getFileUrl(url))
          : [],
        media_urls: portfolio.media_urls
          ? (portfolio.media_urls as string[]).map((url: string) => getFileUrl(url))
          : []
      }));

      return {
        success: true,
        message: "Portfolios retrieved successfully",
        data: transformedPortfolios
      };
    } catch (error: any) {
      console.error("Get User Portfolios Error:", error);
      return {
        success: false,
        message: "Failed to get portfolios"
      };
    }
  }

  /**
   * Get a single portfolio by ID (unique_id)
   */
  static async getPortfolioById(userId: number, uniqueId: string): Promise<ServiceResponse> {
    try {
      const portfolio = await prisma.portfolio.findFirst({
        where: { 
          unique_id: uniqueId,
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
      });

      if (!portfolio) {
        return {
          success: false,
          message: "Portfolio not found"
        };
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
      };

      return {
        success: true,
        message: "Portfolio retrieved successfully",
        data: transformedPortfolio
      };
    } catch (error: any) {
      console.error("Get Portfolio By ID Error:", error);
      return {
        success: false,
        message: "Failed to get portfolio"
      };
    }
  }

  /**
   * Create a new portfolio
   */
  static async createPortfolio(userId: number, portfolioData: CreatePortfolioInput): Promise<ServiceResponse> {
    try {
      const portfolio = await prisma.portfolio.create({
        data: {
          unique_id: ulid(),
          user_id: userId,
          title: portfolioData.title,
          description: portfolioData.description,
          company_name: portfolioData.companyName,
          hide_company_name: portfolioData.hideCompanyName || false,
          industry_id: portfolioData.industryId,
          role: portfolioData.role || null,
          project_skills: (portfolioData.projectSkills || []) as any,
          thumbnail_urls: (portfolioData.thumbnail || []) as any,
          media_urls: (portfolioData.media || []) as any,
          project_link: portfolioData.projectLink || null,
          completion_month: portfolioData.completionMonth || '',
          completion_year: portfolioData.completionYear || '',
          references: (portfolioData.references || []) as any,
          status: portfolioData.status || 'DRAFT'
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
      });

      // Transform URLs to full URLs
      const transformedPortfolio = {
        ...portfolio,
        thumbnail_urls: portfolio.thumbnail_urls 
          ? (portfolio.thumbnail_urls as string[]).map((url: string) => getFileUrl(url))
          : [],
        media_urls: portfolio.media_urls
          ? (portfolio.media_urls as string[]).map((url: string) => getFileUrl(url))
          : []
      };

      return {
        success: true,
        message: "Portfolio created successfully",
        data: transformedPortfolio
      };
    } catch (error: any) {
      console.error("Create Portfolio Error:", error);
      return {
        success: false,
        message: "Failed to create portfolio"
      };
    }
  }

  /**
   * Update an existing portfolio
   */
  static async updatePortfolio(userId: number, uniqueId: string, portfolioData: UpdatePortfolioInput): Promise<ServiceResponse> {
    try {
      // Check if portfolio exists and belongs to user
      const existingPortfolio = await prisma.portfolio.findFirst({
        where: {
          unique_id: uniqueId,
          user_id: userId,
          deleted_at: null
        }
      });

      if (!existingPortfolio) {
        return {
          success: false,
          message: "Portfolio not found"
        };
      }

      const updatedPortfolio = await prisma.portfolio.update({
        where: { id: existingPortfolio.id },
        data: {
          title: portfolioData.title,
          description: portfolioData.description,
          company_name: portfolioData.companyName,
          hide_company_name: portfolioData.hideCompanyName,
          industry_id: portfolioData.industryId,
          role: portfolioData.role,
          project_skills: (portfolioData.projectSkills || []) as any,
          thumbnail_urls: (portfolioData.thumbnail || []) as any,
          media_urls: (portfolioData.media || []) as any,
          project_link: portfolioData.projectLink,
          completion_month: portfolioData.completionMonth,
          completion_year: portfolioData.completionYear,
          references: (portfolioData.references || []) as any,
          status: portfolioData.status || existingPortfolio.status
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
      });

      // Transform URLs to full URLs
      const transformedPortfolio = {
        ...updatedPortfolio,
        thumbnail_urls: updatedPortfolio.thumbnail_urls 
          ? (updatedPortfolio.thumbnail_urls as string[]).map((url: string) => getFileUrl(url))
          : [],
        media_urls: updatedPortfolio.media_urls
          ? (updatedPortfolio.media_urls as string[]).map((url: string) => getFileUrl(url))
          : []
      };

      return {
        success: true,
        message: "Portfolio updated successfully",
        data: transformedPortfolio
      };
    } catch (error: any) {
      console.error("Update Portfolio Error:", error);
      return {
        success: false,
        message: "Failed to update portfolio"
      };
    }
  }

  /**
   * Delete a portfolio (soft delete)
   */
  static async deletePortfolio(userId: number, uniqueId: string): Promise<ServiceResponse> {
    try {
      // Check if portfolio exists and belongs to user
      const existingPortfolio = await prisma.portfolio.findFirst({
        where: {
          unique_id: uniqueId,
          user_id: userId,
          deleted_at: null
        }
      });

      if (!existingPortfolio) {
        return {
          success: false,
          message: "Portfolio not found"
        };
      }

      // Soft delete
      await prisma.portfolio.update({
        where: { id: existingPortfolio.id },
        data: { deleted_at: new Date() }
      });

      return {
        success: true,
        message: "Portfolio deleted successfully",
        data: null
      };
    } catch (error: any) {
      console.error("Delete Portfolio Error:", error);
      return {
        success: false,
        message: "Failed to delete portfolio"
      };
    }
  }

  /**
   * Upload portfolio thumbnail
   */
  static async uploadThumbnail(userId: number, files: Express.Multer.File[]): Promise<ServiceResponse> {
    try {
      if (!files || !Array.isArray(files) || files.length === 0) {
        return {
          success: false,
          message: "No files uploaded"
        };
      }

      const thumbnailPaths = files.map((file: Express.Multer.File) => getRelativePath(file.path));
      const thumbnailUrls = thumbnailPaths.map((path: string) => getFileUrl(path));

      return {
        success: true,
        message: "Thumbnail uploaded successfully",
        data: {
          thumbnailPaths,  // Relative paths for storage
          thumbnailUrls    // Full URLs for immediate display
        }
      };
    } catch (error: any) {
      console.error("Upload Thumbnail Error:", error);
      return {
        success: false,
        message: "Failed to upload thumbnail"
      };
    }
  }

  /**
   * Upload portfolio media files
   */
  static async uploadMedia(userId: number, files: Express.Multer.File[]): Promise<ServiceResponse> {
    try {
      if (!files || !Array.isArray(files) || files.length === 0) {
        return {
          success: false,
          message: "No files uploaded"
        };
      }

      const mediaPaths = files.map((file: Express.Multer.File) => getRelativePath(file.path));
      const mediaUrls = mediaPaths.map((path: string) => getFileUrl(path));

      return {
        success: true,
        message: "Media files uploaded successfully",
        data: {
          mediaPaths,  // Relative paths for storage
          mediaUrls    // Full URLs for immediate display
        }
      };
    } catch (error: any) {
      console.error("Upload Media Error:", error);
      return {
        success: false,
        message: "Failed to upload media files"
      };
    }
  }

  /**
   * Delete portfolio file (thumbnail or media)
   */
  static async deletePortfolioFile(userId: number, filePath: string): Promise<ServiceResponse> {
    try {
      if (!filePath) {
        return {
          success: false,
          message: "File path is required"
        };
      }

      // Extract relative path and construct full path
      const relativePath = extractRelativePath(filePath);
      const fullPath = path.join(process.cwd(), 'uploads', relativePath);

      // Check if file exists and delete it
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      return {
        success: true,
        message: "File deleted successfully",
        data: null
      };
    } catch (error: any) {
      console.error("Delete Portfolio File Error:", error);
      return {
        success: false,
        message: "Failed to delete file"
      };
    }
  }

  /**
   * Duplicate a portfolio
   */
  static async duplicatePortfolio(userId: number, uniqueId: string): Promise<ServiceResponse> {
    try {
      // Get the original portfolio
      const originalPortfolio = await prisma.portfolio.findFirst({
        where: {
          unique_id: uniqueId,
          user_id: userId,
          deleted_at: null
        }
      });

      if (!originalPortfolio) {
        return {
          success: false,
          message: "Portfolio not found"
        };
      }

      // Create duplicate
      const duplicatedPortfolio = await prisma.portfolio.create({
        data: {
          unique_id: ulid(),
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
          status: 'DRAFT' // Always create duplicates as drafts
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
      });

      // Transform URLs to full URLs
      const transformedPortfolio = {
        ...duplicatedPortfolio,
        thumbnail_urls: duplicatedPortfolio.thumbnail_urls 
          ? (duplicatedPortfolio.thumbnail_urls as string[]).map((url: string) => getFileUrl(url))
          : [],
        media_urls: duplicatedPortfolio.media_urls
          ? (duplicatedPortfolio.media_urls as string[]).map((url: string) => getFileUrl(url))
          : []
      };

      return {
        success: true,
        message: "Portfolio duplicated successfully",
        data: transformedPortfolio
      };
    } catch (error: any) {
      console.error("Duplicate Portfolio Error:", error);
      return {
        success: false,
        message: "Failed to duplicate portfolio"
      };
    }
  }
}

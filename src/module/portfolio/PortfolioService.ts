import { prisma } from "@services/prismaService";
import { CreatePortfolioInput, UpdatePortfolioInput } from "./PortfolioType";
import { ServiceResponse } from "@utils/ApiResponse";
import { resolveAttachmentUrl, resolveAttachmentUrls, urlsOrPathsToAttachmentIds } from '@services/attachmentService';
import { updateCompletionSection } from "../profile/ProfileCompletionService";
import { Log } from '@services/loggerService';


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
      const transformedPortfolios = await Promise.all(portfolios.map(async portfolio => ({
        ...portfolio,
        thumbnail_url: (portfolio as any).thumbnail_url
          ? await resolveAttachmentUrl((portfolio as any).thumbnail_url as string, { fieldName: 'portfolio_thumbnail' })
          : null,
        media_urls: portfolio.media_urls
          ? await resolveAttachmentUrls(portfolio.media_urls as string[], { fieldName: 'portfolio_files' })
          : []
      })));

      return {
        success: true,
        message: "Portfolios retrieved successfully",
        data: transformedPortfolios
      };
    } catch (error: any) {
      Log.error("Error", { error });
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
        thumbnail_url: (portfolio as any).thumbnail_url
          ? await resolveAttachmentUrl((portfolio as any).thumbnail_url as string, { fieldName: 'portfolio_thumbnail' })
          : null,
        media_urls: portfolio.media_urls
          ? await resolveAttachmentUrls(portfolio.media_urls as string[], { fieldName: 'portfolio_files' })
          : []
      };

      return {
        success: true,
        message: "Portfolio retrieved successfully",
        data: transformedPortfolio
      };
    } catch (error: any) {
      Log.error("Error", { error });
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
      const normalizedThumbnail = urlsOrPathsToAttachmentIds([portfolioData.thumbnail])[0] ?? null
      const normalizedMedia = urlsOrPathsToAttachmentIds(portfolioData.media || [])

      // Build data object conditionally
      const createData: any = {
        user_id: userId,
        hide_company_name: portfolioData.hideCompanyName || false,
        project_skills: (portfolioData.projectSkills || []) as any,
        thumbnail_url: normalizedThumbnail as any,
        media_urls: normalizedMedia as any,
        references: (portfolioData.references || []) as any,
        status: portfolioData.status || 'DRAFT'
      };
      
      // Only add optional fields if they have values
      if (portfolioData.title) createData.title = portfolioData.title;
      if (portfolioData.description) createData.description = portfolioData.description;
      if (portfolioData.companyName) createData.company_name = portfolioData.companyName;
      if (portfolioData.role) createData.role = portfolioData.role;
      if (portfolioData.projectLink) createData.project_link = portfolioData.projectLink;
      if (portfolioData.completionMonth) createData.completion_month = portfolioData.completionMonth;
      if (portfolioData.completionYear) createData.completion_year = portfolioData.completionYear;
      
      // Validate industry exists before adding it
      if (portfolioData.industryId) {
        const industryExists = await prisma.industry.findUnique({
          where: { id: portfolioData.industryId }
        });
        if (industryExists) {
          createData.industry_id = portfolioData.industryId;
        }
      }
      
      const portfolio = await prisma.portfolio.create({
        data: createData
      });
      await updateCompletionSection(userId, 'portfolio', true);

      // Transform URLs to full URLs
      const transformedPortfolio = {
        ...portfolio,
        thumbnail_url: (portfolio as any).thumbnail_url
          ? await resolveAttachmentUrl((portfolio as any).thumbnail_url as string, { fieldName: 'portfolio_thumbnail' })
          : null,
        media_urls: portfolio.media_urls
          ? await resolveAttachmentUrls(portfolio.media_urls as string[], { fieldName: 'portfolio_files' })
          : []
      };

      return {
        success: true,
        message: "Portfolio created successfully",
        data: transformedPortfolio
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: error?.message || "Failed to create portfolio"
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

      const normalizedThumbnail = urlsOrPathsToAttachmentIds([portfolioData.thumbnail])[0] ?? null
      const normalizedMedia = urlsOrPathsToAttachmentIds(portfolioData.media || [])

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
          thumbnail_url: normalizedThumbnail as any,
          media_urls: normalizedMedia as any,
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
        thumbnail_url: updatedPortfolio.thumbnail_url
          ? await resolveAttachmentUrl(updatedPortfolio.thumbnail_url as string, { fieldName: 'portfolio_thumbnail' })
          : null,
        media_urls: updatedPortfolio.media_urls
          ? await resolveAttachmentUrls(updatedPortfolio.media_urls as string[], { fieldName: 'portfolio_files' })
          : []
      };

      return {
        success: true,
        message: "Portfolio updated successfully",
        data: transformedPortfolio
      };
    } catch (error: any) {
      Log.error("Error", { error });
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
      const remaining = await prisma.portfolio.count({ where: { user_id: userId, deleted_at: null } });
      await updateCompletionSection(userId, 'portfolio', remaining > 0);
      return {
        success: true,
        message: "Portfolio deleted successfully",
        data: null
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to delete portfolio"
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
          user_id: userId,
          title: `${originalPortfolio.title} (Copy)`,
          description: originalPortfolio.description,
          company_name: originalPortfolio.company_name,
          hide_company_name: originalPortfolio.hide_company_name,
          industry_id: originalPortfolio.industry_id,
          role: originalPortfolio.role,
          project_skills: originalPortfolio.project_skills as any,
          thumbnail_url: (originalPortfolio as any).thumbnail_url as any,
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
        thumbnail_url: (duplicatedPortfolio as any).thumbnail_url
          ? await resolveAttachmentUrl((duplicatedPortfolio as any).thumbnail_url as string, { fieldName: 'portfolio_thumbnail' })
          : null,
        media_urls: duplicatedPortfolio.media_urls
          ? await resolveAttachmentUrls(duplicatedPortfolio.media_urls as string[], { fieldName: 'portfolio_files' })
          : []
      };

      return {
        success: true,
        message: "Portfolio duplicated successfully",
        data: transformedPortfolio
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to duplicate portfolio"
      };
    }
  }
}

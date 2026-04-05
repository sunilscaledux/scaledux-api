import { prisma } from "@services/prismaService";
import { CreatePortfolioInput, UpdatePortfolioInput } from "./PortfolioType";
import { ServiceResponse } from "@utils/ApiResponse";
import { resolveAttachmentUrl, resolveAttachmentUrls, urlsOrPathsToAttachmentIds, markAttachmentsAttached } from '@services/attachmentService';
import { updateCompletionSection } from "../profile/ProfileCompletionService";
import { Log } from '@services/loggerService';


import { appConfig } from '@config/app';
const FRONTEND_URL = appConfig.frontendUrl;

/** Transform a portfolio record: resolve attachment URLs */
async function transformPortfolio(portfolio: any): Promise<any> {
  const [thumbnailUrl, mediaUrls] = await Promise.all([
    portfolio.thumbnail_url
      ? resolveAttachmentUrl(portfolio.thumbnail_url as string, 'portfolio_thumbnail')
      : Promise.resolve(null),
    portfolio.media_urls
      ? resolveAttachmentUrls(portfolio.media_urls as string[], 'portfolio_files')
      : Promise.resolve([])
  ]);

  return {
    ...portfolio,
    thumbnail_url: thumbnailUrl,
    media_urls: mediaUrls,
    scaledux_url: `${FRONTEND_URL}/portfolio/${portfolio.unique_id}`
  };
}

/** Normalize references — store actual URLs directly, no redirect wrapping */
function normalizeReferences(references?: any[]): any[] {
  if (!Array.isArray(references) || references.length === 0) return [];
  return references.map((ref: any) => {
    if (typeof ref === 'string') return { url: ref };
    return { url: ref?.url ?? '' };
  }).filter((ref: any) => ref.url);
}

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

      const transformedPortfolios = await Promise.all(portfolios.map(transformPortfolio));

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
   * Get a single portfolio by ID (unique_id).
   * If userId is provided: return if owner or if portfolio is PUBLISHED.
   * If userId is not provided (public): return only if portfolio is PUBLISHED.
   */
  static async getPortfolioById(uniqueId: string, userId?: number): Promise<ServiceResponse> {
    try {
      const portfolio = await prisma.portfolio.findFirst({
        where: {
          unique_id: uniqueId,
          deleted_at: null
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

      const isOwner = userId != null && portfolio.user_id === userId;
      const isPublished = portfolio.status === 'PUBLISHED';
      if (!isOwner && !isPublished) {
        return {
          success: false,
          message: "Portfolio not found"
        };
      }

      const transformedPortfolio = await transformPortfolio(portfolio);

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
        references: normalizeReferences(portfolioData.references) as any,
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
      const allFileIds = [normalizedThumbnail, ...normalizedMedia].filter(Boolean) as string[];
      if (allFileIds.length > 0) await markAttachmentsAttached(allFileIds, [userId]);
      await updateCompletionSection(userId, 'portfolio', true);

      // References are stored as actual URLs (no redirect wrapping)

      const transformedPortfolio = await transformPortfolio(portfolio);

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
          project_link: portfolioData.projectLink || null,
          completion_month: portfolioData.completionMonth,
          completion_year: portfolioData.completionYear,
          references: normalizeReferences(portfolioData.references) as any,
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

      const allFileIds = [normalizedThumbnail, ...normalizedMedia].filter(Boolean) as string[];
      if (allFileIds.length > 0) await markAttachmentsAttached(allFileIds, [userId]);

      const transformedPortfolio = await transformPortfolio(updatedPortfolio);

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

      const transformedPortfolio = await transformPortfolio(duplicatedPortfolio);

      return {
        success: true,
        message: "Portfolio duplicated and saved in Drafts",
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

import { prisma } from "@services/prismaService";
import {
  CreateInvestmentPortfolioInput,
  UpdateInvestmentPortfolioInput
} from "./InvestmentPortfolioType";
import { ServiceResponse } from "@utils/ApiResponse";
import { resolveAttachmentUrl, urlsOrPathsToAttachmentIds } from "@services/attachmentService";
import { Log } from '@services/loggerService';

export class InvestmentPortfolioService {
  static async getUserInvestmentPortfolios(
    userId: number,
    status?: string
  ): Promise<ServiceResponse> {
    try {
      const whereClause: any = { user_id: userId };
      if (status) {
        whereClause.status = status;
      }

      const portfolios = await prisma.investorPortfolio.findMany({
        where: {
          ...whereClause,
          deleted_at: null
        },
        include: {
          industry: {
            select: { id: true, name: true, description: true }
          },
          subIndustry: {
            select: { id: true, name: true, description: true }
          }
        },
        orderBy: { created_at: "desc" }
      });

      const transformed = await Promise.all(portfolios.map(async (p) => ({
        ...p,
        company_logo_url: p.company_logo
          ? await resolveAttachmentUrl(p.company_logo, { entityType: 'generic', fieldName: 'attachment' })
          : null
      })));

      return {
        success: true,
        message: "Investment portfolios retrieved successfully",
        data: transformed
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to get investment portfolios"
      };
    }
  }

  static async getInvestmentPortfolioById(
    userId: number,
    uniqueId: string
  ): Promise<ServiceResponse> {
    try {
      const portfolio = await prisma.investorPortfolio.findFirst({
        where: {
          unique_id: uniqueId,
          user_id: userId,
          deleted_at: null
        },
        include: {
          industry: {
            select: { id: true, name: true, description: true }
          },
          subIndustry: {
            select: { id: true, name: true, description: true }
          }
        }
      });

      if (!portfolio) {
        return { success: false, message: "Investment portfolio not found" };
      }

      const transformed = {
        ...portfolio,
        company_logo_url: portfolio.company_logo
          ? await resolveAttachmentUrl(portfolio.company_logo, { entityType: 'generic', fieldName: 'attachment' })
          : null
      };

      return {
        success: true,
        message: "Investment portfolio retrieved successfully",
        data: transformed
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to get investment portfolio"
      };
    }
  }

  /**
   * Get published investment portfolio by unique_id (public, no auth).
   * Only returns PUBLISHED portfolios; drafts are not exposed.
   */
  static async getPublicByUniqueId(uniqueId: string): Promise<ServiceResponse> {
    try {
      const portfolio = await prisma.investorPortfolio.findFirst({
        where: {
          unique_id: uniqueId,
          deleted_at: null,
          status: "PUBLISHED"
        },
        include: {
          industry: {
            select: { id: true, name: true, description: true }
          },
          subIndustry: {
            select: { id: true, name: true, description: true }
          }
        }
      });

      if (!portfolio) {
        return { success: false, message: "Investment portfolio not found" };
      }

      const transformed = {
        ...portfolio,
        company_logo_url: portfolio.company_logo
          ? await resolveAttachmentUrl(portfolio.company_logo, { entityType: 'generic', fieldName: 'attachment' })
          : null
      };

      return {
        success: true,
        message: "Investment portfolio retrieved successfully",
        data: transformed
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to get investment portfolio"
      };
    }
  }

  static async createInvestmentPortfolio(
    userId: number,
    data: CreateInvestmentPortfolioInput
  ): Promise<ServiceResponse> {
    try {
      const normalizedLogo = urlsOrPathsToAttachmentIds([data.companyLogo])[0] ?? null;

      const createData: any = {
        user_id: userId,
        company_name: data.companyName || "",
        company_logo: normalizedLogo,
        description: data.description,
        company_website: data.companyWebsite,
        industry_id: data.industryId,
        sub_industry_id: data.subIndustryId,
        investment_size: data.investmentSize,
        investment_size_currency: data.investmentSizeCurrency,
        investment_date: data.investmentDate
          ? new Date(data.investmentDate)
          : null,
        round_participated_in: data.roundParticipatedIn,
        current_status: data.currentStatus || "Active",
        board_advisory_role: data.boardAdvisoryRole,
        impact_in_company_growth: data.impactInCompanyGrowth,
        exit_information: data.exitInformation,
        status: data.status || "DRAFT"
      };

      const portfolio = await prisma.investorPortfolio.create({
        data: createData,
        include: {
          industry: {
            select: { id: true, name: true, description: true }
          },
          subIndustry: {
            select: { id: true, name: true, description: true }
          }
        }
      });

      const transformed = {
        ...portfolio,
        company_logo_url: portfolio.company_logo
          ? await resolveAttachmentUrl(portfolio.company_logo, { entityType: 'generic', fieldName: 'attachment' })
          : null
      };

      return {
        success: true,
        message: "Investment portfolio created successfully",
        data: transformed
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: error?.message || "Failed to create investment portfolio"
      };
    }
  }

  static async updateInvestmentPortfolio(
    userId: number,
    uniqueId: string,
    data: UpdateInvestmentPortfolioInput
  ): Promise<ServiceResponse> {
    try {
      const existing = await prisma.investorPortfolio.findFirst({
        where: {
          unique_id: uniqueId,
          user_id: userId,
          deleted_at: null
        }
      });

      if (!existing) {
        return { success: false, message: "Investment portfolio not found" };
      }

      const normalizedLogo = data.companyLogo ? urlsOrPathsToAttachmentIds([data.companyLogo])[0] : undefined;

      const updateData: any = {};
      if (data.companyName !== undefined) updateData.company_name = data.companyName;
      if (normalizedLogo !== undefined) updateData.company_logo = normalizedLogo;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.companyWebsite !== undefined)
        updateData.company_website = data.companyWebsite;
      if (data.industryId !== undefined) updateData.industry_id = data.industryId;
      if (data.subIndustryId !== undefined)
        updateData.sub_industry_id = data.subIndustryId;
      if (data.investmentSize !== undefined)
        updateData.investment_size = data.investmentSize;
      if (data.investmentSizeCurrency !== undefined)
        updateData.investment_size_currency = data.investmentSizeCurrency;
      if (data.investmentDate !== undefined)
        updateData.investment_date = data.investmentDate
          ? new Date(data.investmentDate)
          : null;
      if (data.roundParticipatedIn !== undefined)
        updateData.round_participated_in = data.roundParticipatedIn;
      if (data.currentStatus !== undefined)
        updateData.current_status = data.currentStatus;
      if (data.boardAdvisoryRole !== undefined)
        updateData.board_advisory_role = data.boardAdvisoryRole;
      if (data.impactInCompanyGrowth !== undefined)
        updateData.impact_in_company_growth = data.impactInCompanyGrowth;
      if (data.exitInformation !== undefined)
        updateData.exit_information = data.exitInformation;
      if (data.status !== undefined) updateData.status = data.status;

      const portfolio = await prisma.investorPortfolio.update({
        where: { id: existing.id },
        data: updateData,
        include: {
          industry: {
            select: { id: true, name: true, description: true }
          },
          subIndustry: {
            select: { id: true, name: true, description: true }
          }
        }
      });

      const transformed = {
        ...portfolio,
        company_logo_url: portfolio.company_logo
          ? await resolveAttachmentUrl(portfolio.company_logo, { entityType: 'generic', fieldName: 'attachment' })
          : null
      };

      return {
        success: true,
        message: "Investment portfolio updated successfully",
        data: transformed
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to update investment portfolio"
      };
    }
  }

  static async deleteInvestmentPortfolio(
    userId: number,
    uniqueId: string
  ): Promise<ServiceResponse> {
    try {
      const existing = await prisma.investorPortfolio.findFirst({
        where: {
          unique_id: uniqueId,
          user_id: userId,
          deleted_at: null
        }
      });

      if (!existing) {
        return { success: false, message: "Investment portfolio not found" };
      }

      await prisma.investorPortfolio.update({
        where: { id: existing.id },
        data: { deleted_at: new Date() }
      });

      return {
        success: true,
        message: "Investment portfolio deleted successfully",
        data: null
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to delete investment portfolio"
      };
    }
  }

  static async duplicateInvestmentPortfolio(
    userId: number,
    uniqueId: string
  ): Promise<ServiceResponse> {
    try {
      const original = await prisma.investorPortfolio.findFirst({
        where: {
          unique_id: uniqueId,
          user_id: userId,
          deleted_at: null
        }
      });

      if (!original) {
        return { success: false, message: "Investment portfolio not found" };
      }

      const portfolio = await prisma.investorPortfolio.create({
        data: {
          user_id: userId,
          company_name: `${original.company_name} (Copy)`,
          company_logo: original.company_logo,
          description: original.description,
          company_website: original.company_website,
          industry_id: original.industry_id,
          sub_industry_id: original.sub_industry_id,
          investment_size: original.investment_size,
          investment_date: original.investment_date,
          round_participated_in: original.round_participated_in,
          current_status: original.current_status,
          board_advisory_role: original.board_advisory_role,
          impact_in_company_growth: original.impact_in_company_growth,
          exit_information: original.exit_information,
          status: "DRAFT"
        },
        include: {
          industry: {
            select: { id: true, name: true, description: true }
          },
          subIndustry: {
            select: { id: true, name: true, description: true }
          }
        }
      });

      const transformed = {
        ...portfolio,
        company_logo_url: portfolio.company_logo
          ? await resolveAttachmentUrl(portfolio.company_logo, { entityType: 'generic', fieldName: 'attachment' })
          : null
      };

      return {
        success: true,
        message: "Investment portfolio duplicated successfully",
        data: transformed
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to duplicate investment portfolio"
      };
    }
  }
}

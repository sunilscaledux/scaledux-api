import { Request, Response } from 'express'
import { prisma } from "../../services/prismaService";
import { ApiResponse } from "@utils/ApiResponse";
import { getIntParam, getStringParam } from "@utils/requestHelpers";

import { getPublicUrl } from "@services/bunnyStorageService"
import { FUNDING_STAGES, INVESTOR_TYPES, INVESTMENT_CRITERIA_OPTIONS } from "../../constants/fundingStages"
import { STARTUP_STAGES } from "../../constants/startupStages"
import { CONTRACT_END_REASONS } from "../../constants/contractEndReasons"
import { MEETING_REASONS, MeetingAction } from "../../constants/meetingReasons"
import { ID_TYPES } from "../../constants/idTypes"

// Country related functions
export async function getCountries(req: Request, res: Response) {
  const countriesData = await prisma.country.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      phone_code: true,
      flag: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const countries = countriesData.map(country => ({
    ...country,
    flag: country.flag ? getPublicUrl(country.flag) : null
  }))

  return ApiResponse.success(res, countries, "Countries retrieved successfully")
}

export async function getStatesByCountry(req: Request, res: Response) {
  const countryId = getIntParam(req.params.countryId)

  if (!countryId) {
    return ApiResponse.error(res, "Country ID is required", 400)
  }

  const states = await prisma.state.findMany({
    where: {
      country_id: countryId
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: {
      name: 'asc'
    }
  })

  return ApiResponse.success(res, states, "States retrieved successfully")
}

export async function getAllCountriesWithStates(req: Request, res: Response) {
  const countriesData = await prisma.country.findMany({
    include: {
      states: {
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: {
          name: 'asc'
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  })

  const countries = countriesData.map(country => ({
    ...country,
    flag: country.flag ? getPublicUrl(country.flag) : null
  }))

  return ApiResponse.success(res, countries, "Countries with states retrieved successfully")
}

// Language related functions
export async function getLanguages(req: Request, res: Response) {
  const languages = await prisma.language.findMany({
    where: { is_active: true },
    select: {
      id: true,
      name: true,
      native_name: true,
      code: true,
      country_code: true,
    },
    orderBy: { name: 'asc' }
  })

  return ApiResponse.success(res, languages, "Languages retrieved successfully")
}

export async function getLanguagesByCountry(req: Request, res: Response) {
  const countryCode = getStringParam(req.params.countryCode)

  if (!countryCode) {
    return ApiResponse.error(res, "Country code is required", 400)
  }

  const upperCode = countryCode.toUpperCase()

  const languages = await prisma.language.findMany({
    where: {
      country_code: upperCode,
      is_active: true
    },
    select: {
      id: true,
      name: true,
      native_name: true,
      code: true,
    },
    orderBy: { name: 'asc' }
  })

  return ApiResponse.success(res, languages, "Languages by country retrieved successfully")
}


// Currency related functions
export async function getCurrencies(req: Request, res: Response) {
  const currencies = await prisma.currency.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      symbol: true,
    },
    orderBy: { name: 'asc' }
  })

  return ApiResponse.success(res, currencies, "Currencies retrieved successfully")
}

export async function getCountriesWithCurrencies(req: Request, res: Response) {
  const countries = await prisma.country.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      flag: true,
      currency: {
        select: {
          id: true,
          name: true,
          code: true,
          symbol: true,
        }
      }
    },
    orderBy: { name: 'asc' }
  })

  const countriesWithUrls = countries.map(country => ({
    ...country,
    flag: country.flag ? getPublicUrl(country.flag) : null
  }))

  return ApiResponse.success(res, countriesWithUrls, "Countries with currencies retrieved successfully")
}

// Expertise related functions
export async function getExpertiseCategories(req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    where: { is_active: true },
    orderBy: { name: 'asc' }
  })

  return ApiResponse.success(res, categories, "Expertise categories retrieved successfully")
}

export async function getSpecialtiesByCategory(req: Request, res: Response) {
  const categoryId = getIntParam(req.params.categoryId)

  if (!categoryId) {
    return ApiResponse.error(res, "Category ID is required", 400)
  }

  const specialties = await prisma.subcategory.findMany({
    where: {
      categoryId: categoryId,
      is_active: true
    },
    orderBy: { name: 'asc' }
  })

  return ApiResponse.success(res, specialties, "Specialties retrieved successfully")
}

export async function getSkillsByCategory(req: Request, res: Response) {
  const categoryId = getIntParam(req.params.categoryId)

  if (!categoryId) {
    return ApiResponse.error(res, "Category ID is required", 400)
  }

  const { q, page = 1, limit = 30 } = req.query
  const searchQuery = typeof q === 'string' ? q.trim() : ''
  const pageNum = Math.max(parseInt(page as string) || 1, 1)
  const limitNum = Math.min(parseInt(limit as string) || 30, 100)

  const where: any = { categoryId, is_active: true }
  if (searchQuery) {
    where.name = { contains: searchQuery, mode: 'insensitive' }
  }

  const [total, skills] = await Promise.all([
    prisma.skill.count({ where }),
    prisma.skill.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    })
  ])

  return ApiResponse.success(res, {
    skills,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  }, "Skills retrieved successfully")
}

// Industry related functions
export async function getIndustries(req: Request, res: Response) {
  const industries = await prisma.industry.findMany({
    where: { is_active: true },
    select: {
      id: true,
      name: true,
      description: true
    },
    orderBy: { name: 'asc' }
  })

  return ApiResponse.success(res, industries, "Industries retrieved successfully")
}

export async function getSubIndustriesByIndustry(req: Request, res: Response) {
  const industryId = getIntParam(req.params.industryId)

  if (!industryId) {
    return ApiResponse.error(res, "Industry ID is required", 400)
  }

  const subIndustries = await prisma.subIndustry.findMany({
    where: {
      industry_id: industryId,
      is_active: true
    },
    select: {
      id: true,
      name: true,
      description: true
    },
    orderBy: { name: 'asc' }
  })

  return ApiResponse.success(res, subIndustries, "Sub-industries retrieved successfully")
}

export async function getBusinessModels(req: Request, res: Response) {
  const businessModels = await prisma.businessModel.findMany({
    where: { is_active: true },
    select: {
      id: true,
      name: true,
      code: true,
      description: true
    },
    orderBy: { name: 'asc' }
  })

  return ApiResponse.success(res, businessModels, "Business models retrieved successfully")
}

export async function getRevenueModels(req: Request, res: Response) {
  const { REVENUE_MODELS } = await import("../../constants/revenueModels");
  return ApiResponse.success(res, REVENUE_MODELS, "Revenue models retrieved successfully")
}


/**
 * Get all funding stages
 * GET /api/v1/funding-stages
 */
export async function getFundingStages(req: Request, res: Response) {
  // Return funding stages from constants (no database needed)
  return ApiResponse.success(res, FUNDING_STAGES, "Funding stages retrieved successfully")
}

/**
 * Get all startup stages (for company profile "Startup Stage" dropdown)
 * GET /api/v1/startup-stages
 */
export async function getStartupStages(req: Request, res: Response) {
  return ApiResponse.success(res, STARTUP_STAGES, "Startup stages retrieved successfully")
}

/**
 * Get all investor types (for investment profile form)
 * GET /api/v1/investor-types
 */
export async function getInvestorTypes(req: Request, res: Response) {
  return ApiResponse.success(res, INVESTOR_TYPES, "Investor types retrieved successfully")
}

/**
 * Get investment profile form options (investment criteria only; stages use GET /funding-stages)
 * GET /api/v1/investment-profile-options
 */
export async function getInvestmentProfileOptions(req: Request, res: Response) {
  const data = { criteria: [...INVESTMENT_CRITERIA_OPTIONS] }
  return ApiResponse.success(res, data, "Investment profile options retrieved successfully")
}

/**
 * Get contract end reasons (for private review "reason for ending this contract")
 * GET /api/v1/contract-end-reasons
 */
export async function getContractEndReasons(req: Request, res: Response) {
  return ApiResponse.success(res, CONTRACT_END_REASONS, "Contract end reasons retrieved successfully")
}

/**
 * Get predefined meeting reasons by action type.
 * GET /api/v1/meeting-reasons?type=CANCEL|RESCHEDULE|REJECT
 * Without type param, returns all reason groups.
 */
export async function getMeetingReasons(req: Request, res: Response) {
  const type = req.query.type as string | undefined;
  if (type) {
    const upper = type.toUpperCase() as MeetingAction;
    if (!(upper in MEETING_REASONS)) {
      return ApiResponse.error(res, "Invalid type. Must be one of: CANCEL, RESCHEDULE, REJECT", 400);
    }
    return ApiResponse.success(res, MEETING_REASONS[upper], "Meeting reasons retrieved successfully");
  }
  return ApiResponse.success(res, MEETING_REASONS, "Meeting reasons retrieved successfully");
}

/**
 * Get accepted ID types for identity verification
 * GET /api/v1/id-types
 */
export async function getIdTypes(req: Request, res: Response) {
  return ApiResponse.success(res, ID_TYPES, "ID types retrieved successfully")
}

// Skills search function for large datasets
export async function searchSkills(req: Request, res: Response) {
  const { q: query, limit = 20, categoryId } = req.query

  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return ApiResponse.error(res, "Search query must be at least 2 characters", 400)
  }

  const searchLimit = Math.min(parseInt(limit as string) || 20, 100) // Max 100 results
  const catId = categoryId ? parseInt(categoryId as string) : null

  // Search skills with case-insensitive partial matching
  const skills = await prisma.skill.findMany({
    where: {
      is_active: true,
      name: {
        contains: query.trim(),
        mode: 'insensitive'
      },
      ...(catId ? { categoryId: catId } : {}),
    },
    select: {
      id: true,
      name: true,
      description: true,
      category: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: [
      {
        name: 'asc'
      }
    ],
    take: searchLimit
  })

  return ApiResponse.success(res, skills, `Found ${skills.length} skills matching "${query}"`)
}

// Get all skills (with pagination for large datasets)
export async function getAllSkills(req: Request, res: Response) {
  const { page = 1, limit = 50 } = req.query
  const pageNum = Math.max(parseInt(page as string) || 1, 1)
  const limitNum = Math.min(parseInt(limit as string) || 50, 100) // Max 100 per page
  const skip = (pageNum - 1) * limitNum

  // Get total count and skills
  const [totalCount, skills] = await Promise.all([
    prisma.skill.count({
      where: { is_active: true }
    }),
    prisma.skill.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        description: true,
        category: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { name: 'asc' },
      skip,
      take: limitNum
    })
  ])

  const result = {
    skills,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalCount,
      pages: Math.ceil(totalCount / limitNum)
    }
  }

  return ApiResponse.success(res, result, "Skills retrieved successfully")
}

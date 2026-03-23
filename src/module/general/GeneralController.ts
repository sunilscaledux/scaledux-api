import { Request, Response } from 'express'
import { prisma } from "../../services/prismaService";
import { ApiResponse } from "@utils/ApiResponse";
import redisClient from "@services/redisService";
import { getIntParam, getStringParam } from "@utils/requestHelpers";
import { Log } from '@services/loggerService';

import { getPublicUrl } from "@services/bunnyStorageService"
import { FUNDING_STAGES, INVESTOR_TYPES, INVESTMENT_CRITERIA_OPTIONS } from "../../constants/fundingStages"
import { CONTRACT_END_REASONS } from "../../constants/contractEndReasons"
import { ID_TYPES } from "../../constants/idTypes"

// Cache invalidation helper function
export async function invalidateLocationCache(countryId?: string) {
  try {
    const keysToDelete = [
      'countries:all',
      'countries:with-states:all',
      'currencies:all',
      'countries:with-currencies:all'
    ]
    
    if (countryId) {
      keysToDelete.push(`states:country:${countryId}`)
    } else {
      // If no specific country, invalidate all state caches
      const stateKeys = await redisClient.keys('states:country:*')
      keysToDelete.push(...stateKeys)
    }
    
    if (keysToDelete.length > 0) {
      await redisClient.del(...keysToDelete)
    }
  } catch (error) {
    Log.error("Error", { error })
  }
}

// Cache invalidation endpoint
export async function invalidateCache(req: Request, res: Response) {
  try {
    await invalidateLocationCache()
    
    return ApiResponse.success(res, { 
      message: 'Cache invalidated successfully',
      timestamp: new Date().toISOString()
    }, "Cache invalidated successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to invalidate cache")
  }
}

// Country related functions
export async function getCountries(req: Request, res: Response) {
  try {
    const cacheKey = 'countries:all'
    
    // Try to get from Redis cache first
    const cachedCountries = await redisClient.get(cacheKey)
    if (cachedCountries) {
      return ApiResponse.success(res, JSON.parse(cachedCountries), "Countries retrieved successfully")
    }

    // If not in cache, fetch from database
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

    // Store in Redis cache for 24 hours (864000 seconds)
    await redisClient.setex(cacheKey, 864000, JSON.stringify(countries))

    return ApiResponse.success(res, countries, "Countries retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to get countries")
  }
}

export async function getStatesByCountry(req: Request, res: Response) {
  try {
    const countryId = getIntParam(req.params.countryId)

    if (!countryId) {
      return ApiResponse.error(res, "Country ID is required", 400)
    }

    const cacheKey = `states:country:${countryId}`
    
    // Try to get from Redis cache first
    const cachedStates = await redisClient.get(cacheKey)
    if (cachedStates) {
      return ApiResponse.success(res, JSON.parse(cachedStates), "States retrieved successfully")
    }

    // If not in cache, fetch from database
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

    // Store in Redis cache for 24 hours (864000 seconds)
    await redisClient.setex(cacheKey, 864000, JSON.stringify(states))

    return ApiResponse.success(res, states, "States retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to get states")
  }
}

export async function getAllCountriesWithStates(req: Request, res: Response) {
  try {
    const cacheKey = 'countries:with-states:all'
    
    // Try to get from Redis cache first
    const cachedData = await redisClient.get(cacheKey)
    if (cachedData) {
      return ApiResponse.success(res, JSON.parse(cachedData), "Countries with states retrieved successfully")
    }

    // If not in cache, fetch from database
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

    // Store in Redis cache for 24 hours (864000 seconds)
    await redisClient.setex(cacheKey, 864000*30, JSON.stringify(countries))

    return ApiResponse.success(res, countries, "Countries with states retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to get countries with states")
  }
}

// Language related functions
export async function getLanguages(req: Request, res: Response) {
  try {
    const languages = await prisma.language.findMany({
      where: {
        is_active: true
      },
      select: {
        id: true,
        name: true,
        native_name: true,
        code: true,
        country_code: true,
      },
      orderBy: {
        name: 'asc'
      }
    })

    return ApiResponse.success(res, languages, "Languages retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to get languages")
  }
}

export async function getLanguagesByCountry(req: Request, res: Response) {
  try {
    const countryCode = getStringParam(req.params.countryCode)

    if (!countryCode) {
      return ApiResponse.error(res, "Country code is required", 400)
    }

    const languages = await prisma.language.findMany({
      where: {
        country_code: countryCode.toUpperCase(),
        is_active: true
      },
      select: {
        id: true,
        name: true,
        native_name: true,
        code: true,
      },
      orderBy: {
        name: 'asc'
      }
    })

    return ApiResponse.success(res, languages, "Languages by country retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to get languages by country")
  }
}


// Cache warming endpoint
export async function warmLocationCache(req: Request, res: Response) {
  try {
    
    // Warm countries cache
    const countries = await prisma.country.findMany({
      select: { id: true, name: true, code: true, phone_code: true, flag: true },
      orderBy: { name: 'asc' }
    })
    
    const countriesWithUrls = countries.map(country => ({
      ...country,
      flag: country.flag ? getPublicUrl(country.flag) : null
    }))
    
    await redisClient.setex('countries:all', 864000, JSON.stringify(countriesWithUrls))
    
    // Warm countries with states cache
    const countriesWithStates = await prisma.country.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        phone_code: true,
        flag: true,
        states: {
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    })
    
    const countriesWithStatesAndUrls = countriesWithStates.map(country => ({
      ...country,
      flag: country.flag ? getPublicUrl(country.flag) : null
    }))
    
    await redisClient.setex('countries:with-states:all', 864000, JSON.stringify(countriesWithStatesAndUrls))
    
    // Warm states cache for each country
    for (const country of countries) {
      const states = await prisma.state.findMany({
        where: { country_id: country.id },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' }
      })
      await redisClient.setex(`states:country:${country.id}`, 864000, JSON.stringify(states))
    }

    const currencies = await prisma.currency.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        symbol: true,
      }
    })
    await redisClient.setex('currencies:all', 864000, JSON.stringify(currencies))

    const countriesWithCurrencies = await prisma.country.findMany({
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
      }
    })
    const countriesWithCurrenciesAndUrls = countriesWithCurrencies.map(country => ({
      ...country,
      flag: country.flag ? getPublicUrl(country.flag) : null
    }))
    await redisClient.setex(
      'countries:with-currencies:all',
      864000,
      JSON.stringify(countriesWithCurrenciesAndUrls)
    )
    
    return ApiResponse.success(res, { 
      message: 'Cache warmed successfully',
      countriesCount: countries.length,
      timestamp: new Date().toISOString()
    }, "Cache warmed successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to warm cache")
  }
}

// Currency related functions
export async function getCurrencies(req: Request, res: Response) {
  try {
    const cacheKey = 'currencies:all'
    
    // Try to get from Redis cache first
    const cachedCurrencies = await redisClient.get(cacheKey)
    if (cachedCurrencies) {
      return ApiResponse.success(res, JSON.parse(cachedCurrencies), "Currencies retrieved successfully")
    }

    // If not in cache, fetch from database
    const currencies = await prisma.currency.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        symbol: true,
      },
      orderBy: { name: 'asc' }
    })

    // Cache the result for 24 hours
    await redisClient.setex(cacheKey, 864000, JSON.stringify(currencies))

    return ApiResponse.success(res, currencies, "Currencies retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to retrieve currencies")
  }
}

export async function getCountriesWithCurrencies(req: Request, res: Response) {
  try {
    const cacheKey = 'countries:with-currencies:all'
    
    // Try to get from Redis cache first
    const cachedData = await redisClient.get(cacheKey)
    if (cachedData) {
      return ApiResponse.success(res, JSON.parse(cachedData), "Countries with currencies retrieved successfully")
    }

    // If not in cache, fetch from database
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

    // Cache the result for 24 hours
    await redisClient.setex(cacheKey, 864000, JSON.stringify(countriesWithUrls))

    return ApiResponse.success(res, countriesWithUrls, "Countries with currencies retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to retrieve countries with currencies")
  }
}

// Expertise related functions
export async function getExpertiseCategories(req: Request, res: Response) {
  try {
    const cacheKey = 'expertise:categories:all'
    
    // Try to get from Redis cache first
    const cachedCategories = await redisClient.get(cacheKey)
    if (cachedCategories) {
      return ApiResponse.success(res, JSON.parse(cachedCategories), "Expertise categories retrieved successfully")
    }

    // If not in cache, fetch from database
    const categories = await prisma.category.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' }
    })

    // Cache for 24 hours
    await redisClient.setex(cacheKey, 864000, JSON.stringify(categories))

    return ApiResponse.success(res, categories, "Expertise categories retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to retrieve expertise categories")
  }
}

export async function getSpecialtiesByCategory(req: Request, res: Response) {
  try {
    const categoryId = getIntParam(req.params.categoryId)
    
    if (!categoryId) {
      return ApiResponse.error(res, "Category ID is required", 400)
    }

    const cacheKey = `expertise:specialties:category:${categoryId}`
    
    // Try to get from Redis cache first
    const cachedSpecialties = await redisClient.get(cacheKey)
    if (cachedSpecialties) {
      return ApiResponse.success(res, JSON.parse(cachedSpecialties), "Specialties retrieved successfully")
    }

    // If not in cache, fetch from database
    const specialties = await prisma.subcategory.findMany({
      where: { 
        categoryId: categoryId,
        is_active: true 
      },
      orderBy: { name: 'asc' }
    })

    // Cache for 24 hours
    await redisClient.setex(cacheKey, 864000, JSON.stringify(specialties))

    return ApiResponse.success(res, specialties, "Specialties retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to retrieve specialties")
  }
}

export async function getSkillsByCategory(req: Request, res: Response) {
  try {
    const categoryId = getIntParam(req.params.categoryId)
    
    if (!categoryId) {
      return ApiResponse.error(res, "Category ID is required", 400)
    }

    const cacheKey = `expertise:skills:category:${categoryId}`
    
    // Try to get from Redis cache first
    const cachedSkills = await redisClient.get(cacheKey)
    if (cachedSkills) {
      return ApiResponse.success(res, JSON.parse(cachedSkills), "Skills retrieved successfully")
    }

    // If not in cache, fetch from database
    const skills = await prisma.skill.findMany({
      where: { 
        categoryId: categoryId,
        is_active: true 
      },
      orderBy: { name: 'asc' }
    })

    // Cache for 24 hours
    await redisClient.setex(cacheKey, 864000, JSON.stringify(skills))

    return ApiResponse.success(res, skills, "Skills retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to retrieve skills")
  }
}

// Industry related functions
export async function getIndustries(req: Request, res: Response) {
  try {
    const cacheKey = "industries";
    
    // Try to get from Redis cache first
    const cachedIndustries = await redisClient.get(cacheKey)
    if (cachedIndustries) {
      return ApiResponse.success(res, JSON.parse(cachedIndustries), "Industries retrieved successfully")
    }

    // If not in cache, fetch from database
    const industries = await prisma.industry.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        description: true
      },
      orderBy: { name: 'asc' }
    })

    // Cache for 24 hours
    await redisClient.setex(cacheKey, 864000, JSON.stringify(industries))

    return ApiResponse.success(res, industries, "Industries retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to retrieve industries")
  }
}

export async function getSubIndustriesByIndustry(req: Request, res: Response) {
  try {
    const industryId = getIntParam(req.params.industryId)
    
    if (!industryId) {
      return ApiResponse.error(res, "Industry ID is required", 400)
    }

    const cacheKey = `sub-industries:industry:${industryId}`
    
    // Try to get from Redis cache first
    const cachedSubIndustries = await redisClient.get(cacheKey)
    if (cachedSubIndustries) {
      return ApiResponse.success(res, JSON.parse(cachedSubIndustries), "Sub-industries retrieved successfully")
    }

    // If not in cache, fetch from database
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

    // Cache for 24 hours
    await redisClient.setex(cacheKey, 864000, JSON.stringify(subIndustries))

    return ApiResponse.success(res, subIndustries, "Sub-industries retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to retrieve sub-industries")
  }
}

export async function getBusinessModels(req: Request, res: Response) {
  try {
    const cacheKey = "business-models";
    
    // Try to get from Redis cache first
    const cachedModels = await redisClient.get(cacheKey)
    if (cachedModels) {
      return ApiResponse.success(res, JSON.parse(cachedModels), "Business models retrieved successfully")
    }

    // If not in cache, fetch from database
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

    // Cache for 24 hours
    await redisClient.setex(cacheKey, 864000, JSON.stringify(businessModels))

    return ApiResponse.success(res, businessModels, "Business models retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to retrieve business models")
  }
}

export async function getRevenueModels(req: Request, res: Response) {
  try {
    const cacheKey = "revenue-models";
    
    // Try to get from Redis cache first
    const cachedModels = await redisClient.get(cacheKey)
    if (cachedModels) {
      return ApiResponse.success(res, JSON.parse(cachedModels), "Revenue models retrieved successfully")
    }

    // If not in cache, fetch from database
    const revenueModels = await prisma.revenueModel.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        code: true,
        description: true
      },
      orderBy: { name: 'asc' }
    })

    // Cache for 24 hours
    await redisClient.setex(cacheKey, 864000, JSON.stringify(revenueModels))

    return ApiResponse.success(res, revenueModels, "Revenue models retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to retrieve revenue models")
  }
}

/**
 * Get all team roles
 * GET /api/v1/team-roles
 */
export async function getTeamRoles(req: Request, res: Response) {
  try {
    const cacheKey = 'team-roles'
    
    // Try to get from Redis cache first
    const cachedRoles = await redisClient.get(cacheKey)
    if (cachedRoles) {
      return ApiResponse.success(res, JSON.parse(cachedRoles), "Team roles retrieved successfully")
    }

    // If not in cache, fetch from database
    const teamRoles = await prisma.teamRole.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        description: true
      }
    })

    // Cache for 24 hours
    await redisClient.setex(cacheKey, 86400, JSON.stringify(teamRoles))

    return ApiResponse.success(res, teamRoles, "Team roles retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to retrieve team roles")
  }
}

/**
 * Get all funding stages
 * GET /api/v1/funding-stages
 */
export async function getFundingStages(req: Request, res: Response) {
  try {
    // Return funding stages from constants (no database needed)
    return ApiResponse.success(res, FUNDING_STAGES, "Funding stages retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to retrieve funding stages")
  }
}

/**
 * Get all investor types (for investment profile form)
 * GET /api/v1/investor-types
 */
export async function getInvestorTypes(req: Request, res: Response) {
  try {
    return ApiResponse.success(res, INVESTOR_TYPES, "Investor types retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to retrieve investor types")
  }
}

/**
 * Get investment profile form options (investment criteria only; stages use GET /funding-stages)
 * GET /api/v1/investment-profile-options
 */
export async function getInvestmentProfileOptions(req: Request, res: Response) {
  try {
    const data = { criteria: [...INVESTMENT_CRITERIA_OPTIONS] }
    return ApiResponse.success(res, data, "Investment profile options retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to retrieve investment profile options")
  }
}

/**
 * Get contract end reasons (for private review "reason for ending this contract")
 * GET /api/v1/contract-end-reasons
 */
export async function getContractEndReasons(req: Request, res: Response) {
  try {
    return ApiResponse.success(res, CONTRACT_END_REASONS, "Contract end reasons retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to retrieve contract end reasons")
  }
}

/**
 * Get accepted ID types for identity verification
 * GET /api/v1/id-types
 */
export async function getIdTypes(req: Request, res: Response) {
  try {
    return ApiResponse.success(res, ID_TYPES, "ID types retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to retrieve ID types")
  }
}

// Skills search function for large datasets
export async function searchSkills(req: Request, res: Response) {
  try {
    const { q: query, limit = 20 } = req.query
    
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return ApiResponse.error(res, "Search query must be at least 2 characters", 400)
    }

    const searchLimit = Math.min(parseInt(limit as string) || 20, 100) // Max 100 results

    // Search skills with case-insensitive partial matching
    const skills = await prisma.skill.findMany({
      where: {
        is_active: true,
        name: {
          contains: query.trim(),
          mode: 'insensitive'
        }
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
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to search skills")
  }
}

// Get all skills (with pagination for large datasets)
export async function getAllSkills(req: Request, res: Response) {
  try {
    const { page = 1, limit = 50 } = req.query
    const pageNum = Math.max(parseInt(page as string) || 1, 1)
    const limitNum = Math.min(parseInt(limit as string) || 50, 100) // Max 100 per page
    const skip = (pageNum - 1) * limitNum

    const cacheKey = `skills:all:page:${pageNum}:limit:${limitNum}`
    
    // Try to get from Redis cache first
    const cachedData = await redisClient.get(cacheKey)
    if (cachedData) {
      return ApiResponse.success(res, JSON.parse(cachedData), "Skills retrieved successfully")
    }

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

    // Cache for 1 hour (shorter cache for paginated data)
    await redisClient.setex(cacheKey, 3600, JSON.stringify(result))

    return ApiResponse.success(res, result, "Skills retrieved successfully")
  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to retrieve skills")
  }
}

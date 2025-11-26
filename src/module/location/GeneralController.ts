import { Request, Response } from 'express'
import { prisma } from "@config/prisma"
import { ApiResponse } from "@utils/ApiResponse"
import redisClient from "@config/redis"
import { getFileUrl } from "@utils/General"

// Cache invalidation helper function
export async function invalidateLocationCache(countryId?: string) {
  try {
    const keysToDelete = [
      'countries:all',
      'countries:with-states:all'
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
    console.error('Cache invalidation error:', error)
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
    console.error("Cache invalidation error:", error)
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

    // Map flag paths to full URLs using getFileUrl
    const countries = countriesData.map(country => ({
      ...country,
      flag: country.flag ? getFileUrl(country.flag) : null
    }))

    // Store in Redis cache for 24 hours (864000 seconds)
    await redisClient.setex(cacheKey, 864000, JSON.stringify(countries))

    return ApiResponse.success(res, countries, "Countries retrieved successfully")
  } catch (error: any) {
    console.error("Get Countries Error:", error)
    return ApiResponse.error(res, "Failed to get countries")
  }
}

export async function getStatesByCountry(req: Request, res: Response) {
  try {
    const { countryId } = req.params

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
        country_id: parseInt(countryId)
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
    console.error("Get States Error:", error)
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

    // Map flag paths to full URLs using getFileUrl
    const countries = countriesData.map(country => ({
      ...country,
      flag: country.flag ? getFileUrl(country.flag) : null
    }))

    // Store in Redis cache for 24 hours (864000 seconds)
    await redisClient.setex(cacheKey, 864000*30, JSON.stringify(countries))

    return ApiResponse.success(res, countries, "Countries with states retrieved successfully")
  } catch (error: any) {
    console.error("Get Countries with States Error:", error)
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
    console.error("Get Languages Error:", error)
    return ApiResponse.error(res, "Failed to get languages")
  }
}

export async function getLanguagesByCountry(req: Request, res: Response) {
  try {
    const { countryCode } = req.params

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
    console.error("Get Languages by Country Error:", error)
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
    
    // Map flag paths to full URLs using getFileUrl
    const countriesWithUrls = countries.map(country => ({
      ...country,
      flag: country.flag ? getFileUrl(country.flag) : null
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
    
    // Map flag paths to full URLs using getFileUrl
    const countriesWithStatesAndUrls = countriesWithStates.map(country => ({
      ...country,
      flag: country.flag ? getFileUrl(country.flag) : null
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
    
    return ApiResponse.success(res, { 
      message: 'Cache warmed successfully',
      countriesCount: countries.length,
      timestamp: new Date().toISOString()
    }, "Cache warmed successfully")
  } catch (error: any) {
    console.error("Cache warming error:", error)
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
    console.error("Get currencies error:", error)
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

    // Map flag paths to full URLs using getFileUrl
    const countriesWithUrls = countries.map(country => ({
      ...country,
      flag: country.flag ? getFileUrl(country.flag) : null
    }))

    // Cache the result for 24 hours
    await redisClient.setex(cacheKey, 864000, JSON.stringify(countriesWithUrls))

    return ApiResponse.success(res, countriesWithUrls, "Countries with currencies retrieved successfully")
  } catch (error: any) {
    console.error("Get countries with currencies error:", error)
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
    const categories = await prisma.expertiseCategory.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' }
    })

    // Cache for 24 hours
    await redisClient.setex(cacheKey, 864000, JSON.stringify(categories))

    return ApiResponse.success(res, categories, "Expertise categories retrieved successfully")
  } catch (error: any) {
    console.error("Get Expertise Categories Error:", error)
    return ApiResponse.error(res, "Failed to retrieve expertise categories")
  }
}

export async function getSpecialtiesByCategory(req: Request, res: Response) {
  try {
    const categoryId = parseInt(req.params.categoryId)
    
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
    const specialties = await prisma.specialty.findMany({
      where: { 
        expertise_category_id: categoryId,
        is_active: true 
      },
      orderBy: { name: 'asc' }
    })

    // Cache for 24 hours
    await redisClient.setex(cacheKey, 864000, JSON.stringify(specialties))

    return ApiResponse.success(res, specialties, "Specialties retrieved successfully")
  } catch (error: any) {
    console.error("Get Specialties Error:", error)
    return ApiResponse.error(res, "Failed to retrieve specialties")
  }
}

export async function getSkillsByCategory(req: Request, res: Response) {
  try {
    const categoryId = parseInt(req.params.categoryId)
    
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
        expertise_category_id: categoryId,
        is_active: true 
      },
      orderBy: { name: 'asc' }
    })

    // Cache for 24 hours
    await redisClient.setex(cacheKey, 864000, JSON.stringify(skills))

    return ApiResponse.success(res, skills, "Skills retrieved successfully")
  } catch (error: any) {
    console.error("Get Skills Error:", error)
    return ApiResponse.error(res, "Failed to retrieve skills")
  }
}

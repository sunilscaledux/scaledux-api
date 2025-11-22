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
      console.log('🗑️  Location cache invalidated:', keysToDelete)
    }
  } catch (error) {
    console.error('Cache invalidation error:', error)
  }
}

// Country related functions
export async function getCountries(req: Request, res: Response) {
  try {
    const cacheKey = 'countries:all'
    
    // Try to get from Redis cache first
    const cachedCountries = await redisClient.get(cacheKey)
    if (cachedCountries) {
      console.log('📦 Countries retrieved from cache')
      return ApiResponse.success(res, JSON.parse(cachedCountries), "Countries retrieved successfully")
    }

    // If not in cache, fetch from database
    const countriesData = await prisma.country.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        flag: true,
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
    await redisClient.setex(cacheKey, 864000, JSON.stringify(countries))
    console.log('💾 Countries cached in Redis')

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
      console.log(`📦 States for country ${countryId} retrieved from cache`)
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
    console.log(`💾 States for country ${countryId} cached in Redis`)

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
      console.log('📦 Countries with states retrieved from cache')
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
    console.log('💾 Countries with states cached in Redis')

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

    return ApiResponse.success(res, languages, "Languages retrieved successfully")
  } catch (error: any) {
    console.error("Get Languages by Country Error:", error)
    return ApiResponse.error(res, "Failed to get languages")
  }
}

// Cache warming endpoint
export async function warmLocationCache(req: Request, res: Response) {
  try {
    console.log('🔥 Starting cache warming...')
    
    // Warm countries cache
    const countries = await prisma.country.findMany({
      select: { id: true, name: true, code: true, flag: true },
      orderBy: { name: 'asc' }
    })
    await redisClient.setex('countries:all', 864000, JSON.stringify(countries))
    
    // Warm countries with states cache
    const countriesWithStates = await prisma.country.findMany({
      include: {
        states: {
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    })
    await redisClient.setex('countries:with-states:all', 864000, JSON.stringify(countriesWithStates))
    
    // Warm states cache for each country
    for (const country of countries) {
      const states = await prisma.state.findMany({
        where: { country_id: country.id },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' }
      })
      await redisClient.setex(`states:country:${country.id}`, 864000, JSON.stringify(states))
    }
    
    console.log('🔥 Cache warming completed successfully')
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
      console.log('📦 Currencies retrieved from cache')
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
    console.log('💾 Currencies cached for 24 hours')

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
      console.log('📦 Countries with currencies retrieved from cache')
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
    console.log('💾 Countries with currencies cached for 24 hours')

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
      console.log('📦 Expertise categories retrieved from cache')
      return ApiResponse.success(res, JSON.parse(cachedCategories), "Expertise categories retrieved successfully")
    }

    // If not in cache, fetch from database
    const categories = await prisma.expertiseCategory.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' }
    })

    // Cache for 24 hours
    await redisClient.setex(cacheKey, 864000, JSON.stringify(categories))
    console.log('💾 Expertise categories cached')

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
      console.log('📦 Specialties retrieved from cache')
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
    console.log('💾 Specialties cached')

    return ApiResponse.success(res, specialties, "Specialties retrieved successfully")
  } catch (error: any) {
    console.error("Get Specialties Error:", error)
    return ApiResponse.error(res, "Failed to retrieve specialties")
  }
}

export async function getSkillsBySpecialty(req: Request, res: Response) {
  try {
    const specialtyId = parseInt(req.params.specialtyId)
    
    if (!specialtyId) {
      return ApiResponse.error(res, "Specialty ID is required", 400)
    }

    const cacheKey = `expertise:skills:specialty:${specialtyId}`
    
    // Try to get from Redis cache first
    const cachedSkills = await redisClient.get(cacheKey)
    if (cachedSkills) {
      console.log('📦 Skills retrieved from cache')
      return ApiResponse.success(res, JSON.parse(cachedSkills), "Skills retrieved successfully")
    }

    // If not in cache, fetch from database
    const skills = await prisma.skill.findMany({
      where: { 
        specialty_id: specialtyId,
        is_active: true 
      },
      orderBy: { name: 'asc' }
    })

    // Cache for 24 hours
    await redisClient.setex(cacheKey, 864000, JSON.stringify(skills))
    console.log('💾 Skills cached')

    return ApiResponse.success(res, skills, "Skills retrieved successfully")
  } catch (error: any) {
    console.error("Get Skills Error:", error)
    return ApiResponse.error(res, "Failed to retrieve skills")
  }
}

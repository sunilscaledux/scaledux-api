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

    // Store in Redis cache for 24 hours (86400 seconds)
    await redisClient.setex(cacheKey, 86400, JSON.stringify(countries))
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

    // Store in Redis cache for 24 hours (86400 seconds)
    await redisClient.setex(cacheKey, 86400, JSON.stringify(states))
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

    // Store in Redis cache for 24 hours (86400 seconds)
    await redisClient.setex(cacheKey, 86400*30, JSON.stringify(countries))
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
    await redisClient.setex('countries:all', 86400, JSON.stringify(countries))
    
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
    await redisClient.setex('countries:with-states:all', 86400, JSON.stringify(countriesWithStates))
    
    // Warm states cache for each country
    for (const country of countries) {
      const states = await prisma.state.findMany({
        where: { country_id: country.id },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' }
      })
      await redisClient.setex(`states:country:${country.id}`, 86400, JSON.stringify(states))
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

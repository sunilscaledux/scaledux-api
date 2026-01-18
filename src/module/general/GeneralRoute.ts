import { Router } from "express"
import {
  getCountries,
  getStatesByCountry,
  getAllCountriesWithStates,
  getLanguages,
  getLanguagesByCountry,
  getCurrencies,
  getCountriesWithCurrencies,
  warmLocationCache,
  invalidateLocationCache,
  invalidateCache,
  getExpertiseCategories,
  getSpecialtiesByCategory,
  getSkillsByCategory,
  getIndustries,
  getSubIndustriesByIndustry,
  getBusinessModels,
  searchSkills,
  getAllSkills,
  getServiceCategories,
  getServiceSubCategories,
  getServiceKeywords,
} from "./GeneralController"

const router = Router()

// Country and State endpoints
router.get("/countries", getCountries)
router.get("/countries/:countryId/states", getStatesByCountry)
router.get("/countries-with-states", getAllCountriesWithStates)

// Language endpoints
router.get("/languages", getLanguages)
router.get("/languages/country/:countryCode", getLanguagesByCountry)

// Currency endpoints
router.get("/currencies", getCurrencies)
router.get("/countries-with-currencies", getCountriesWithCurrencies)

// Expertise endpoints (hierarchical)
router.get("/expertise-categories", getExpertiseCategories)
router.get("/expertise-categories/:categoryId/specialties", getSpecialtiesByCategory)
router.get("/expertise-categories/:categoryId/skills", getSkillsByCategory)

// Industry endpoints
router.get("/industries", getIndustries)
router.get("/industries/:industryId/sub-industries", getSubIndustriesByIndustry)
router.get("/business-models", getBusinessModels)

// Skills endpoints (for large datasets)
router.get("/skills/search", searchSkills) // GET /skills/search?q=javascript&limit=20
router.get("/skills", getAllSkills) // GET /skills?page=1&limit=50

// Service Category endpoints
router.get("/service-categories", getServiceCategories)
router.get("/service-categories/:categoryId/subcategories", getServiceSubCategories)
router.get("/service-categories/:categoryId/keywords", getServiceKeywords) // GET /service-categories/1/keywords?limit=50

// Cache management endpoints
router.post("/cache/warm", warmLocationCache)
router.delete("/cache/invalidate", invalidateCache)

export default router

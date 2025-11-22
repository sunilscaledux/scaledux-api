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
  getSkillsBySpecialty,
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
router.get("/specialties/:specialtyId/skills", getSkillsBySpecialty)

// Cache management endpoints
router.post("/cache/warm", warmLocationCache)
router.delete("/cache/invalidate", invalidateCache)

export default router

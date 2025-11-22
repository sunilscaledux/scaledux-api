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
router.delete("/cache/invalidate", async (req, res) => {
  try {
    await invalidateLocationCache()
    res.json({ success: true, message: "Cache invalidated successfully" })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to invalidate cache" })
  }
})

export default router

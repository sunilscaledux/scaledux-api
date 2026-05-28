import { Router } from "express"
import {
  getCountries,
  getStatesByCountry,
  getAllCountriesWithStates,
  getLanguages,
  getLanguagesByCountry,
  getCurrencies,
  getCountriesWithCurrencies,
  getExpertiseCategories,
  getSpecialtiesByCategory,
  getSkillsByCategory,
  getIndustries,
  getSubIndustriesByIndustry,
  getBusinessModels,
  getRevenueModels,
  getFundingStages,
  getStartupStages,
  getInvestorTypes,
  getInvestmentProfileOptions,
  getContractEndReasons,
  getMeetingReasons,
  getIdTypes,
  searchSkills,
  getAllSkills,
} from "./GeneralController"

const router = Router()

router.get("/countries", getCountries)
router.get("/countries/:countryId/states", getStatesByCountry)
router.get("/countries-with-states", getAllCountriesWithStates)

router.get("/languages", getLanguages)
router.get("/languages/country/:countryCode", getLanguagesByCountry)

router.get("/currencies", getCurrencies)
router.get("/countries-with-currencies", getCountriesWithCurrencies)

router.get("/categories", getExpertiseCategories)
router.get("/categories/:categoryId/subcategories", getSpecialtiesByCategory)
router.get("/categories/:categoryId/skills", getSkillsByCategory)

router.get("/industries", getIndustries)
router.get("/industries/:industryId/sub-industries", getSubIndustriesByIndustry)
router.get("/business-models", getBusinessModels)
router.get("/revenue-models", getRevenueModels)
router.get("/funding-stages", getFundingStages)
router.get("/startup-stages", getStartupStages)
router.get("/investor-types", getInvestorTypes)
router.get("/investment-profile-options", getInvestmentProfileOptions)
router.get("/contract-end-reasons", getContractEndReasons)
router.get("/meeting-reasons", getMeetingReasons)
router.get("/id-types", getIdTypes)

router.get("/skills/search", searchSkills)
router.get("/skills", getAllSkills)

export default router

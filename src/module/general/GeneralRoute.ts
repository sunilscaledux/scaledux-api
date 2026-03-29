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
  getInvestorTypes,
  getInvestmentProfileOptions,
  getContractEndReasons,
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

router.get("/expertise-categories", getExpertiseCategories)
router.get("/expertise-categories/:categoryId/specialties", getSpecialtiesByCategory)
router.get("/expertise-categories/:categoryId/skills", getSkillsByCategory)

router.get("/industries", getIndustries)
router.get("/industries/:industryId/sub-industries", getSubIndustriesByIndustry)
router.get("/business-models", getBusinessModels)
router.get("/revenue-models", getRevenueModels)
router.get("/funding-stages", getFundingStages)
router.get("/investor-types", getInvestorTypes)
router.get("/investment-profile-options", getInvestmentProfileOptions)
router.get("/contract-end-reasons", getContractEndReasons)
router.get("/id-types", getIdTypes)

router.get("/skills/search", searchSkills)
router.get("/skills", getAllSkills)

export default router

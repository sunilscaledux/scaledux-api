import type { CategoryTaxonomy } from './types'
import {
  PROGRAMMING_IT_CATEGORY_NAME,
  programmingITSubcategories,
} from './programmingIT'
import {
  AI_DATA_SCIENCE_CATEGORY_NAME,
  aiDataScienceSubcategories,
} from './aiDataScience'
import {
  GRAPHICS_CREATIVE_CATEGORY_NAME,
  graphicsCreativeSubcategories,
} from './graphicsCreative'
import { MARKETING_CATEGORY_NAME, marketingSubcategories } from './marketing'
import {
  SALES_BUSINESS_DEVELOPMENT_CATEGORY_NAME,
  salesBusinessDevelopmentSubcategories,
} from './salesBusinessDevelopment'
import {
  WRITING_TRANSLATION_CATEGORY_NAME,
  writingTranslationSubcategories,
} from './writingTranslation'
import {
  VIDEO_ANIMATION_CATEGORY_NAME,
  videoAnimationSubcategories,
} from './videoAnimation'
import {
  BUSINESS_OPERATIONS_CATEGORY_NAME,
  businessOperationsSubcategories,
} from './businessOperations'
import { LEGAL_CATEGORY_NAME, legalSubcategories } from './legal'
import {
  FINANCE_ACCOUNTING_CATEGORY_NAME,
  financeAccountingSubcategories,
} from './financeAccounting'

/** Canonical order for seed and APIs. */
export const EXPERTISE_TAXONOMY_BUNDLES: CategoryTaxonomy[] = [
  {
    categoryName: PROGRAMMING_IT_CATEGORY_NAME,
    subcategories: programmingITSubcategories,
  },
  {
    categoryName: AI_DATA_SCIENCE_CATEGORY_NAME,
    subcategories: aiDataScienceSubcategories,
  },
  {
    categoryName: GRAPHICS_CREATIVE_CATEGORY_NAME,
    subcategories: graphicsCreativeSubcategories,
  },
  {
    categoryName: MARKETING_CATEGORY_NAME,
    subcategories: marketingSubcategories,
  },
  {
    categoryName: SALES_BUSINESS_DEVELOPMENT_CATEGORY_NAME,
    subcategories: salesBusinessDevelopmentSubcategories,
  },
  {
    categoryName: WRITING_TRANSLATION_CATEGORY_NAME,
    subcategories: writingTranslationSubcategories,
  },
  {
    categoryName: VIDEO_ANIMATION_CATEGORY_NAME,
    subcategories: videoAnimationSubcategories,
  },
  {
    categoryName: BUSINESS_OPERATIONS_CATEGORY_NAME,
    subcategories: businessOperationsSubcategories,
  },
  {
    categoryName: LEGAL_CATEGORY_NAME,
    subcategories: legalSubcategories,
  },
  {
    categoryName: FINANCE_ACCOUNTING_CATEGORY_NAME,
    subcategories: financeAccountingSubcategories,
  },
]

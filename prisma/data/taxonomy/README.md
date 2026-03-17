# Taxonomy data (categories → subcategories → skills)

- **`index.ts`** — `EXPERTISE_TAXONOMY_BUNDLES` (all categories in seed order). Used by `prisma/seeds/expertise-seed.ts`.

- **`programmingIT.ts`** — `Programming & IT` + 11 subcategories.
- **`aiDataScience.ts`** — `AI & Data Science` + 12 subcategories.
- **`graphicsCreative.ts`** — `Graphics & Creative` + 12 subcategories (source sheet: Design & Graphics).
- **`salesBusinessDevelopment.ts`** — `Sales & Business Development` + 10 subcategories.
- **`marketing.ts`** — `Marketing` + 18 subcategories.
- **`writingTranslation.ts`** — `Writing & Translation` + 18 subcategories (bookkeeping/payroll block from paste excluded—use Business or Finance).
- **`videoAnimation.ts`** — `Video & Animation` + 22 subcategories.
- **`businessOperations.ts`** — `Business & Operations` + 15 subcategories.
- **`legal.ts`** — `Legal` + 18 subcategories.
- **`financeAccounting.ts`** — `Finance & Accounting` + 15 subcategories.

**Shape**

```ts
export const CATEGORY_NAME = '…'
export const subcategories: SubcategoryWithSkills[] = [
  { name: 'Subcategory A', skills: ['Skill 1', 'Skill 2'] },
]
```

**DB mapping**

| File field        | Prisma        |
|-------------------|---------------|
| category name     | `Category.name` |
| subcategory name  | `Subcategory.name` + `categoryId` |
| each skill string | `Skill.name` + `categoryId` (same category; duplicates across subcategories merge) |

**Seeding (`npm run seed`)** — Wipes **all** `UserExpertise`, **all** `FounderProject` (and cascaded invites/proposals/milestones/etc.), **all** `ServicePackage`, then all `Skill` / `Subcategory` / `Category` rows, then inserts the bundles from `index.ts`. Do not run on production without a backup.

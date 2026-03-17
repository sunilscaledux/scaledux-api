/** One row per subcategory; skills belong to the parent category in DB (Skill.categoryId). */
export type SubcategoryWithSkills = {
  name: string
  skills: string[]
}

export type CategoryTaxonomy = {
  categoryName: string
  subcategories: SubcategoryWithSkills[]
}

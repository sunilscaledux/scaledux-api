import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';

export class ContentService {
  /* ───────────── Categories ───────────── */
  static async listCategories(): Promise<ServiceResponse> {
    const rows = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { subcategories: true, skills: true } } },
    });
    return { success: true, message: 'Success', data: rows };
  }

  static async createCategory(body: {
    name?: unknown;
    description?: unknown;
  }): Promise<ServiceResponse> {
    const { name, description } = body;
    if (!name) return { success: false, message: 'name is required', statusCode: 400 };
    const row = await prisma.category.create({
      data: { name: name as string, description: (description as string) ?? null },
    });
    return { success: true, message: 'Category created', data: row, statusCode: 201 };
  }

  static async updateCategory(
    id: number,
    body: { name?: any; description?: any; is_active?: unknown }
  ): Promise<ServiceResponse> {
    const { name, description, is_active } = body;
    const row = await prisma.category.update({
      where: { id },
      data: { name, description, ...(typeof is_active === 'boolean' ? { is_active } : {}) },
    });
    return { success: true, message: 'Category updated', data: row };
  }

  /* ───────────── Subcategories ───────────── */
  static async listSubcategories(categoryId?: number): Promise<ServiceResponse> {
    const rows = await prisma.subcategory.findMany({
      where: categoryId ? { categoryId } : {},
      orderBy: { name: 'asc' },
      include: { category: { select: { name: true } } },
    });
    return { success: true, message: 'Success', data: rows };
  }

  static async createSubcategory(body: {
    name?: unknown;
    description?: unknown;
    category_id?: unknown;
  }): Promise<ServiceResponse> {
    const { name, description, category_id } = body;
    if (!name || !category_id)
      return { success: false, message: 'name and category_id are required', statusCode: 400 };
    const row = await prisma.subcategory.create({
      data: {
        name: name as string,
        description: (description as string) ?? null,
        categoryId: Number(category_id),
      },
    });
    return { success: true, message: 'Subcategory created', data: row, statusCode: 201 };
  }

  static async updateSubcategory(
    id: number,
    body: { name?: any; description?: any; is_active?: unknown }
  ): Promise<ServiceResponse> {
    const { name, description, is_active } = body;
    const row = await prisma.subcategory.update({
      where: { id },
      data: { name, description, ...(typeof is_active === 'boolean' ? { is_active } : {}) },
    });
    return { success: true, message: 'Subcategory updated', data: row };
  }

  /* ───────────── Skills ───────────── */
  static async listSkills(categoryId?: number): Promise<ServiceResponse> {
    const rows = await prisma.skill.findMany({
      where: categoryId ? { categoryId } : {},
      orderBy: { name: 'asc' },
      include: { category: { select: { name: true } } },
    });
    return { success: true, message: 'Success', data: rows };
  }

  static async createSkill(body: {
    name?: unknown;
    description?: unknown;
    category_id?: unknown;
  }): Promise<ServiceResponse> {
    const { name, description, category_id } = body;
    if (!name || !category_id)
      return { success: false, message: 'name and category_id are required', statusCode: 400 };
    const row = await prisma.skill.create({
      data: {
        name: name as string,
        description: (description as string) ?? null,
        categoryId: Number(category_id),
      },
    });
    return { success: true, message: 'Skill created', data: row, statusCode: 201 };
  }

  static async updateSkill(
    id: number,
    body: { name?: any; description?: any; is_active?: unknown }
  ): Promise<ServiceResponse> {
    const { name, description, is_active } = body;
    const row = await prisma.skill.update({
      where: { id },
      data: { name, description, ...(typeof is_active === 'boolean' ? { is_active } : {}) },
    });
    return { success: true, message: 'Skill updated', data: row };
  }

  /* ───────────── Industries ───────────── */
  static async listIndustries(): Promise<ServiceResponse> {
    const rows = await prisma.industry.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { subIndustries: true } } },
    });
    return { success: true, message: 'Success', data: rows };
  }

  static async createIndustry(body: {
    name?: unknown;
    description?: unknown;
  }): Promise<ServiceResponse> {
    const { name, description } = body;
    if (!name) return { success: false, message: 'name is required', statusCode: 400 };
    const row = await prisma.industry.create({
      data: { name: name as string, description: (description as string) ?? null },
    });
    return { success: true, message: 'Industry created', data: row, statusCode: 201 };
  }

  static async updateIndustry(
    id: number,
    body: { name?: any; description?: any; is_active?: unknown }
  ): Promise<ServiceResponse> {
    const { name, description, is_active } = body;
    const row = await prisma.industry.update({
      where: { id },
      data: { name, description, ...(typeof is_active === 'boolean' ? { is_active } : {}) },
    });
    return { success: true, message: 'Industry updated', data: row };
  }

  static async listSubIndustries(industryId?: number): Promise<ServiceResponse> {
    const rows = await prisma.subIndustry.findMany({
      where: industryId ? { industry_id: industryId } : {},
      orderBy: { name: 'asc' },
      include: { industry: { select: { name: true } } },
    });
    return { success: true, message: 'Success', data: rows };
  }

  static async createSubIndustry(body: {
    name?: unknown;
    description?: unknown;
    industry_id?: unknown;
  }): Promise<ServiceResponse> {
    const { name, description, industry_id } = body;
    if (!name || !industry_id)
      return { success: false, message: 'name and industry_id are required', statusCode: 400 };
    const row = await prisma.subIndustry.create({
      data: {
        name: name as string,
        description: (description as string) ?? null,
        industry_id: Number(industry_id),
      },
    });
    return { success: true, message: 'Sub-industry created', data: row, statusCode: 201 };
  }

  static async updateSubIndustry(
    id: number,
    body: { name?: any; description?: any; is_active?: unknown }
  ): Promise<ServiceResponse> {
    const { name, description, is_active } = body;
    const row = await prisma.subIndustry.update({
      where: { id },
      data: { name, description, ...(typeof is_active === 'boolean' ? { is_active } : {}) },
    });
    return { success: true, message: 'Sub-industry updated', data: row };
  }

  /* ───────────── Business Models ───────────── */
  static async listBusinessModels(): Promise<ServiceResponse> {
    const rows = await prisma.businessModel.findMany({ orderBy: { name: 'asc' } });
    return { success: true, message: 'Success', data: rows };
  }

  static async createBusinessModel(body: {
    name?: unknown;
    code?: unknown;
    description?: unknown;
  }): Promise<ServiceResponse> {
    const { name, code, description } = body;
    if (!name || !code)
      return { success: false, message: 'name and code are required', statusCode: 400 };
    const row = await prisma.businessModel.create({
      data: { name: name as string, code: code as string, description: (description as string) ?? null },
    });
    return { success: true, message: 'Business model created', data: row, statusCode: 201 };
  }

  static async updateBusinessModel(
    id: number,
    body: { name?: any; code?: any; description?: any; is_active?: unknown }
  ): Promise<ServiceResponse> {
    const { name, code, description, is_active } = body;
    const row = await prisma.businessModel.update({
      where: { id },
      data: { name, code, description, ...(typeof is_active === 'boolean' ? { is_active } : {}) },
    });
    return { success: true, message: 'Business model updated', data: row };
  }
}

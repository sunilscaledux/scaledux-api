import { Request, Response } from 'express';
import { prisma } from '@services/prismaService';
import { ApiResponse } from '@utils/ApiResponse';
import { auditFromReq } from '@admin/services/auditService';

/* ───────────── Categories ───────────── */
export async function listCategories(_req: Request, res: Response) {
  const rows = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { subcategories: true, skills: true } } },
  });
  return ApiResponse.success(res, rows);
}

export async function createCategory(req: Request, res: Response) {
  const { name, description } = req.body || {};
  if (!name) return ApiResponse.error(res, 'name is required', null, 400);
  const row = await prisma.category.create({ data: { name, description: description ?? null } });
  await auditFromReq(req, 'content.category.create', { entityType: 'Category', entityId: row.id });
  return ApiResponse.created(res, row, 'Category created');
}

export async function updateCategory(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { name, description, is_active } = req.body || {};
  const row = await prisma.category.update({
    where: { id },
    data: { name, description, ...(typeof is_active === 'boolean' ? { is_active } : {}) },
  });
  await auditFromReq(req, 'content.category.update', { entityType: 'Category', entityId: id });
  return ApiResponse.success(res, row, 'Category updated');
}

/* ───────────── Subcategories ───────────── */
export async function listSubcategories(req: Request, res: Response) {
  const categoryId = req.query.category_id ? parseInt(req.query.category_id as string, 10) : undefined;
  const rows = await prisma.subcategory.findMany({
    where: categoryId ? { categoryId } : {},
    orderBy: { name: 'asc' },
    include: { category: { select: { name: true } } },
  });
  return ApiResponse.success(res, rows);
}

export async function createSubcategory(req: Request, res: Response) {
  const { name, description, category_id } = req.body || {};
  if (!name || !category_id) return ApiResponse.error(res, 'name and category_id are required', null, 400);
  const row = await prisma.subcategory.create({
    data: { name, description: description ?? null, categoryId: Number(category_id) },
  });
  await auditFromReq(req, 'content.subcategory.create', { entityType: 'Subcategory', entityId: row.id });
  return ApiResponse.created(res, row, 'Subcategory created');
}

export async function updateSubcategory(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { name, description, is_active } = req.body || {};
  const row = await prisma.subcategory.update({
    where: { id },
    data: { name, description, ...(typeof is_active === 'boolean' ? { is_active } : {}) },
  });
  await auditFromReq(req, 'content.subcategory.update', { entityType: 'Subcategory', entityId: id });
  return ApiResponse.success(res, row, 'Subcategory updated');
}

/* ───────────── Skills ───────────── */
export async function listSkills(req: Request, res: Response) {
  const categoryId = req.query.category_id ? parseInt(req.query.category_id as string, 10) : undefined;
  const rows = await prisma.skill.findMany({
    where: categoryId ? { categoryId } : {},
    orderBy: { name: 'asc' },
    include: { category: { select: { name: true } } },
  });
  return ApiResponse.success(res, rows);
}

export async function createSkill(req: Request, res: Response) {
  const { name, description, category_id } = req.body || {};
  if (!name || !category_id) return ApiResponse.error(res, 'name and category_id are required', null, 400);
  const row = await prisma.skill.create({
    data: { name, description: description ?? null, categoryId: Number(category_id) },
  });
  await auditFromReq(req, 'content.skill.create', { entityType: 'Skill', entityId: row.id });
  return ApiResponse.created(res, row, 'Skill created');
}

export async function updateSkill(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { name, description, is_active } = req.body || {};
  const row = await prisma.skill.update({
    where: { id },
    data: { name, description, ...(typeof is_active === 'boolean' ? { is_active } : {}) },
  });
  await auditFromReq(req, 'content.skill.update', { entityType: 'Skill', entityId: id });
  return ApiResponse.success(res, row, 'Skill updated');
}

/* ───────────── Industries ───────────── */
export async function listIndustries(_req: Request, res: Response) {
  const rows = await prisma.industry.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { subIndustries: true } } },
  });
  return ApiResponse.success(res, rows);
}

export async function createIndustry(req: Request, res: Response) {
  const { name, description } = req.body || {};
  if (!name) return ApiResponse.error(res, 'name is required', null, 400);
  const row = await prisma.industry.create({ data: { name, description: description ?? null } });
  await auditFromReq(req, 'content.industry.create', { entityType: 'Industry', entityId: row.id });
  return ApiResponse.created(res, row, 'Industry created');
}

export async function updateIndustry(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { name, description, is_active } = req.body || {};
  const row = await prisma.industry.update({
    where: { id },
    data: { name, description, ...(typeof is_active === 'boolean' ? { is_active } : {}) },
  });
  await auditFromReq(req, 'content.industry.update', { entityType: 'Industry', entityId: id });
  return ApiResponse.success(res, row, 'Industry updated');
}

export async function listSubIndustries(req: Request, res: Response) {
  const industryId = req.query.industry_id ? parseInt(req.query.industry_id as string, 10) : undefined;
  const rows = await prisma.subIndustry.findMany({
    where: industryId ? { industry_id: industryId } : {},
    orderBy: { name: 'asc' },
    include: { industry: { select: { name: true } } },
  });
  return ApiResponse.success(res, rows);
}

export async function createSubIndustry(req: Request, res: Response) {
  const { name, description, industry_id } = req.body || {};
  if (!name || !industry_id) return ApiResponse.error(res, 'name and industry_id are required', null, 400);
  const row = await prisma.subIndustry.create({
    data: { name, description: description ?? null, industry_id: Number(industry_id) },
  });
  await auditFromReq(req, 'content.subindustry.create', { entityType: 'SubIndustry', entityId: row.id });
  return ApiResponse.created(res, row, 'Sub-industry created');
}

export async function updateSubIndustry(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { name, description, is_active } = req.body || {};
  const row = await prisma.subIndustry.update({
    where: { id },
    data: { name, description, ...(typeof is_active === 'boolean' ? { is_active } : {}) },
  });
  await auditFromReq(req, 'content.subindustry.update', { entityType: 'SubIndustry', entityId: id });
  return ApiResponse.success(res, row, 'Sub-industry updated');
}

/* ───────────── Business Models ───────────── */
export async function listBusinessModels(_req: Request, res: Response) {
  const rows = await prisma.businessModel.findMany({ orderBy: { name: 'asc' } });
  return ApiResponse.success(res, rows);
}

export async function createBusinessModel(req: Request, res: Response) {
  const { name, code, description } = req.body || {};
  if (!name || !code) return ApiResponse.error(res, 'name and code are required', null, 400);
  const row = await prisma.businessModel.create({ data: { name, code, description: description ?? null } });
  await auditFromReq(req, 'content.business_model.create', { entityType: 'BusinessModel', entityId: row.id });
  return ApiResponse.created(res, row, 'Business model created');
}

export async function updateBusinessModel(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { name, code, description, is_active } = req.body || {};
  const row = await prisma.businessModel.update({
    where: { id },
    data: { name, code, description, ...(typeof is_active === 'boolean' ? { is_active } : {}) },
  });
  await auditFromReq(req, 'content.business_model.update', { entityType: 'BusinessModel', entityId: id });
  return ApiResponse.success(res, row, 'Business model updated');
}

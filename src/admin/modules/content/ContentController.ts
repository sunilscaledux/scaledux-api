import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { auditFromReq } from '@admin/services/auditService';
import { ContentService } from './ContentService';

/* ───────────── Categories ───────────── */
export async function listCategories(_req: Request, res: Response) {
  const result = await ContentService.listCategories();
  return ApiResponse.success(res, result.data);
}

export async function createCategory(req: Request, res: Response) {
  const result = await ContentService.createCategory(req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'content.category.create', { entityType: 'Category', entityId: result.data.id });
  return ApiResponse.created(res, result.data, result.message);
}

export async function updateCategory(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await ContentService.updateCategory(id, req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'content.category.update', { entityType: 'Category', entityId: id });
  return ApiResponse.success(res, result.data, result.message);
}

/* ───────────── Subcategories ───────────── */
export async function listSubcategories(req: Request, res: Response) {
  const categoryId = req.query.category_id ? parseInt(req.query.category_id as string, 10) : undefined;
  const result = await ContentService.listSubcategories(categoryId);
  return ApiResponse.success(res, result.data);
}

export async function createSubcategory(req: Request, res: Response) {
  const result = await ContentService.createSubcategory(req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'content.subcategory.create', { entityType: 'Subcategory', entityId: result.data.id });
  return ApiResponse.created(res, result.data, result.message);
}

export async function updateSubcategory(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await ContentService.updateSubcategory(id, req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'content.subcategory.update', { entityType: 'Subcategory', entityId: id });
  return ApiResponse.success(res, result.data, result.message);
}

/* ───────────── Skills ───────────── */
export async function listSkills(req: Request, res: Response) {
  const categoryId = req.query.category_id ? parseInt(req.query.category_id as string, 10) : undefined;
  const result = await ContentService.listSkills(categoryId);
  return ApiResponse.success(res, result.data);
}

export async function createSkill(req: Request, res: Response) {
  const result = await ContentService.createSkill(req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'content.skill.create', { entityType: 'Skill', entityId: result.data.id });
  return ApiResponse.created(res, result.data, result.message);
}

export async function updateSkill(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await ContentService.updateSkill(id, req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'content.skill.update', { entityType: 'Skill', entityId: id });
  return ApiResponse.success(res, result.data, result.message);
}

/* ───────────── Industries ───────────── */
export async function listIndustries(_req: Request, res: Response) {
  const result = await ContentService.listIndustries();
  return ApiResponse.success(res, result.data);
}

export async function createIndustry(req: Request, res: Response) {
  const result = await ContentService.createIndustry(req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'content.industry.create', { entityType: 'Industry', entityId: result.data.id });
  return ApiResponse.created(res, result.data, result.message);
}

export async function updateIndustry(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await ContentService.updateIndustry(id, req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'content.industry.update', { entityType: 'Industry', entityId: id });
  return ApiResponse.success(res, result.data, result.message);
}

export async function listSubIndustries(req: Request, res: Response) {
  const industryId = req.query.industry_id ? parseInt(req.query.industry_id as string, 10) : undefined;
  const result = await ContentService.listSubIndustries(industryId);
  return ApiResponse.success(res, result.data);
}

export async function createSubIndustry(req: Request, res: Response) {
  const result = await ContentService.createSubIndustry(req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'content.subindustry.create', { entityType: 'SubIndustry', entityId: result.data.id });
  return ApiResponse.created(res, result.data, result.message);
}

export async function updateSubIndustry(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await ContentService.updateSubIndustry(id, req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'content.subindustry.update', { entityType: 'SubIndustry', entityId: id });
  return ApiResponse.success(res, result.data, result.message);
}

/* ───────────── Business Models ───────────── */
export async function listBusinessModels(_req: Request, res: Response) {
  const result = await ContentService.listBusinessModels();
  return ApiResponse.success(res, result.data);
}

export async function createBusinessModel(req: Request, res: Response) {
  const result = await ContentService.createBusinessModel(req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'content.business_model.create', { entityType: 'BusinessModel', entityId: result.data.id });
  return ApiResponse.created(res, result.data, result.message);
}

export async function updateBusinessModel(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await ContentService.updateBusinessModel(id, req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'content.business_model.update', { entityType: 'BusinessModel', entityId: id });
  return ApiResponse.success(res, result.data, result.message);
}

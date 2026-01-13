import { Request, Response } from 'express';
import { CompanyService } from './CompanyService';
import { createCompanyDetailSchema, updateCompanyDetailSchema } from './CompanyValidation';

const companyService = new CompanyService();

export class CompanyController {
  /**
   * Create company detail
   * POST /api/v1/company
   */
  async createCompanyDetail(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      // Validate request body
      const { error, value } = createCompanyDetailSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const companyDetail = await companyService.createCompanyDetail(userId, value);

      res.status(201).json({
        success: true,
        message: 'Company detail created successfully',
        data: companyDetail
      });
    } catch (error: any) {
      console.error('Error creating company detail:', error);
      res.status(error.message.includes('already exists') ? 409 : 500).json({
        success: false,
        message: error.message || 'Failed to create company detail'
      });
    }
  }

  /**
   * Get current user's company detail
   * GET /api/v1/company/me
   */
  async getMyCompanyDetail(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const companyDetail = await companyService.getCompanyDetailByUserId(userId);

      if (!companyDetail) {
        res.status(404).json({
          success: false,
          message: 'Company detail not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: companyDetail
      });
    } catch (error: any) {
      console.error('Error fetching company detail:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch company detail'
      });
    }
  }

  /**
   * Get company detail by user ID
   * GET /api/v1/company/user/:userId
   */
  async getCompanyDetailByUserId(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
        return;
      }

      const companyDetail = await companyService.getCompanyDetailByUserId(userId);

      if (!companyDetail) {
        res.status(404).json({
          success: false,
          message: 'Company detail not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: companyDetail
      });
    } catch (error: any) {
      console.error('Error fetching company detail:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch company detail'
      });
    }
  }

  /**
   * Update company detail
   * PATCH /api/v1/company
   */
  async updateCompanyDetail(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      // Validate request body
      const { error, value } = updateCompanyDetailSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
        return;
      }

      const updatedCompany = await companyService.updateCompanyDetail(userId, value);

      res.status(200).json({
        success: true,
        message: 'Company detail updated successfully',
        data: updatedCompany
      });
    } catch (error: any) {
      console.error('Error updating company detail:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message || 'Failed to update company detail'
      });
    }
  }

  /**
   * Delete company detail
   * DELETE /api/v1/company
   */
  async deleteCompanyDetail(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      await companyService.deleteCompanyDetail(userId);

      res.status(200).json({
        success: true,
        message: 'Company detail deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting company detail:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message || 'Failed to delete company detail'
      });
    }
  }

  /**
   * Upload company logo
   * POST /api/v1/company/logo
   */
  async uploadCompanyLogo(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
        return;
      }

      // Construct the logo URL (assuming file is uploaded to /uploads/company/logos/)
      const logoUrl = `/uploads/company/logos/${file.filename}`;

      const updatedCompany = await companyService.uploadCompanyLogo(userId, logoUrl);

      res.status(200).json({
        success: true,
        message: 'Company logo uploaded successfully',
        data: updatedCompany
      });
    } catch (error: any) {
      console.error('Error uploading company logo:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message || 'Failed to upload company logo'
      });
    }
  }

  /**
   * Upload company cover image
   * POST /api/v1/company/cover
   */
  async uploadCompanyCoverImage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
        return;
      }

      // Construct the cover image URL (assuming file is uploaded to /uploads/company/covers/)
      const coverImageUrl = `/uploads/company/covers/${file.filename}`;

      const updatedCompany = await companyService.uploadCompanyCoverImage(userId, coverImageUrl);

      res.status(200).json({
        success: true,
        message: 'Company cover image uploaded successfully',
        data: updatedCompany
      });
    } catch (error: any) {
      console.error('Error uploading company cover image:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message || 'Failed to upload company cover image'
      });
    }
  }

  /**
   * Get all companies (paginated)
   * GET /api/v1/company/all
   */
  async getAllCompanies(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await companyService.getAllCompanies(page, limit);

      res.status(200).json({
        success: true,
        data: result.companies,
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch companies'
      });
    }
  }
}

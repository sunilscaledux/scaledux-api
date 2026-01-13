import { Router } from 'express';
import { CompanyController } from './CompanyController';
import { authenticateToken } from '@middleware/auth';
import { FileUpload } from '@middleware/fileupload';

const router = Router();
const companyController = new CompanyController();

// Configure multer for company uploads
const uploadCompanyLogo = FileUpload({
  uploadPath: 'uploads/company/logos',
  fileFilter: 'image',
  maxSize: 5
});

const uploadCompanyCover = FileUpload({
  uploadPath: 'uploads/company/covers',
  fileFilter: 'image',
  maxSize: 10
});

// Create company detail
router.post(
  '/',
  authenticateToken,
  companyController.createCompanyDetail.bind(companyController)
);

// Get current user's company detail
router.get(
  '/me',
  authenticateToken,
  companyController.getMyCompanyDetail.bind(companyController)
);

// Get company detail by user ID (public)
router.get(
  '/user/:userId',
  companyController.getCompanyDetailByUserId.bind(companyController)
);

// Update company detail
router.patch(
  '/',
  authenticateToken,
  companyController.updateCompanyDetail.bind(companyController)
);

// Delete company detail
router.delete(
  '/',
  authenticateToken,
  companyController.deleteCompanyDetail.bind(companyController)
);

// Upload company logo
router.post(
  '/logo',
  authenticateToken,
  uploadCompanyLogo.single('logo'),
  companyController.uploadCompanyLogo.bind(companyController)
);

// Upload company cover image
router.post(
  '/cover',
  authenticateToken,
  uploadCompanyCover.single('cover'),
  companyController.uploadCompanyCoverImage.bind(companyController)
);

// Get all companies (paginated)
router.get(
  '/all',
  companyController.getAllCompanies.bind(companyController)
);

export default router;

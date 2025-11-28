import multer from 'multer';
import path from 'path';
import fs from 'fs';

// File filter for images only
const imageFileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// File filter for documents
const documentFileFilter = (req: any, file: any, cb: any) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed!'), false);
  }
};

// Generic storage configuration
const createStorage = (uploadPath: string) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const userIdentifier = req.user?.unique_id || req.user?.id || "anonymous";
      const finalPath = path.join(
        "uploads",
        userIdentifier.toString(),
        uploadPath
      );
      if (!fs.existsSync(finalPath)) {
        fs.mkdirSync(finalPath, { recursive: true });
      }
      cb(null, finalPath);
    },

    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
};

// Multer configurations for different use cases
export const FileUpload = (options: {
  uploadPath: string;
  fileFilter?: 'image' | 'document' | 'any';
  maxSize?: number; // in MB
  maxFiles?: number;
}) => {
  const { uploadPath, fileFilter = 'any', maxSize = 5, maxFiles = 1 } = options;
  
  let filter;
  switch (fileFilter) {
    case 'image':
      filter = imageFileFilter;
      break;
    case 'document':
      filter = documentFileFilter;
      break;
    default:
      filter = undefined;
  }

  return multer({
    storage: createStorage(uploadPath),
    fileFilter: filter,
    limits: {
      fileSize: maxSize * 1024 * 1024, // Convert MB to bytes
      files: maxFiles
    }
  });
};



// Helper function to handle multer errors
export const handleMulterError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Please upload a smaller file.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Please upload fewer files.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected field name for file upload.'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error: ' + error.message
        });
    }
  } else if (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'File upload failed.'
    });
  }
  next();
};

// Utility function to delete uploaded files
export const deleteUploadedFile = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};


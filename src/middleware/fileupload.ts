import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PassThrough } from 'stream';
import fileConfig from '@config/file';
import { uploadPublic, uploadPrivate, isConfigured } from '@services/bunnyStorageService';
import { normalizePath } from '@utils/General';

const useBunny = fileConfig.isBunny && isConfigured();

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

// File filter for chat: PDF, JPG, JPEG, DOC, DOCX, ZIP (max 10MB, max 3 files)
const chatFileFilter = (req: any, file: any, cb: any) => {
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip'
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, JPEG, PNG, DOC, DOCX, and ZIP files are allowed.'), false);
  }
};

// File filter for milestone deliverable: images (png, jpg, jpeg, webp, gif), video, audio, zip, documents
const milestoneDeliverableFileFilter = (req: any, file: any, cb: any) => {
  const allowedMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/aac',
    'audio/flac',
    'audio/webm',
    'application/zip',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Allowed: PNG, JPG, JPEG, WebP, GIF, video, audio, ZIP, PDF, DOC, DOCX.'), false);
  }
};

class BunnyStorageEngine implements multer.StorageEngine {
  constructor(
    private readonly uploadPath: string,
    private readonly visibility: 'public' | 'private' = 'public'
  ) {}

  _handleFile(req: any, file: any, cb: (error?: any, info?: Partial<Express.Multer.File>) => void): void {
    const userIdentifier = req.user?.unique_id || req.user?.id || 'anonymous';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`;
    const storagePath = normalizePath(`uploads/${userIdentifier}/${this.uploadPath}/${filename}`);

    let size = 0;
    const passThrough = new PassThrough();
    file.stream.on('data', (chunk: Buffer) => {
      size += chunk.length;
    });
    file.stream.on('error', (err: Error) => {
      cb(err);
    });

    file.stream.pipe(passThrough);

    const uploadPromise = this.visibility === 'private'
      ? uploadPrivate(storagePath, passThrough, file.mimetype)
      : uploadPublic(storagePath, passThrough, file.mimetype);

    uploadPromise
      .then((result) => {
        if (!result.success) {
          cb(new Error(result.message || 'Bunny upload failed'));
          return;
        }
        cb(undefined, {
          path: storagePath,
          size,
          filename,
          destination: `uploads/${userIdentifier}/${this.uploadPath}`,
        } as Partial<Express.Multer.File>);
      })
      .catch((err) => cb(err));
  }

  _removeFile(_req: any, _file: any, cb: (error: Error | null) => void): void {
    cb(null);
  }
}

// Generic storage configuration: disk (local) or Bunny streaming based on fileConfig.default
const createStorage = (uploadPath: string, visibility: 'public' | 'private') => {
  if (useBunny) {
    return new BunnyStorageEngine(uploadPath, visibility);
  }
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const userIdentifier = req.user?.unique_id || req.user?.id || 'anonymous';
      const finalPath = path.join(
        'uploads',
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
  fileFilter?: 'image' | 'document' | 'chat' | 'milestoneDeliverable' | 'any';
  maxSize?: number; // in MB
  maxFiles?: number;
  visibility?: 'public' | 'private';
}) => {
  const { uploadPath, fileFilter = 'any', maxSize = 5, maxFiles = 1, visibility = 'public' } = options;
  
  let filter;
  switch (fileFilter) {
    case 'image':
      filter = imageFileFilter;
      break;
    case 'document':
      filter = documentFileFilter;
      break;
    case 'chat':
      filter = chatFileFilter;
      break;
    case 'milestoneDeliverable':
      filter = milestoneDeliverableFileFilter;
      break;
    default:
      filter = undefined;
  }

  const multerOpts = {
    storage: createStorage(uploadPath, visibility),
    fileFilter: filter,
    limits: {
      fileSize: maxSize * 1024 * 1024, // Convert MB to bytes
      files: maxFiles
    }
  };
  const m = multer(multerOpts);
  return m;
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


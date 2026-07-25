import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Ensure upload directories exist
const uploadDirs = {
  quotes: 'uploads/quotes',
  projects: 'uploads/projects',
  suppliers: 'uploads/suppliers',
  general: 'uploads/general'
};

Object.values(uploadDirs).forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// File type validation
const allowedFileTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif'
];

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed types: PDF, DOC, DOCX, XLS, XLSX, JPEG, PNG, GIF'));
  }
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadType = req.body.uploadType || 'general';
    const uploadDir = uploadDirs[uploadType as keyof typeof uploadDirs] || uploadDirs.general;
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

// Multer configuration
export const uploadConfig = {
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // Maximum 5 files at once
  }
};

// Create multer instances
export const upload = multer(uploadConfig);

// Single file upload middleware
export const uploadSingle = (fieldName: string = 'file') => upload.single(fieldName);

// Multiple files upload middleware
export const uploadMultiple = (fieldName: string = 'files', maxCount: number = 5) => upload.array(fieldName, maxCount);

// File upload validation middleware
export const validateFileUpload = (req: Request, res: any, next: any) => {
  if (!req.file && !req.files) {
    return res.status(400).json({
      error: {
        code: 'NO_FILE_UPLOADED',
        message: 'No file uploaded'
      }
    });
  }
  next();
};
import { Router } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { authenticateTenant, requireRole } from '../middleware/auth';
import { uploadSingle, uploadMultiple, validateFileUpload } from '../config/file-upload';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';
import logger from '../config/logging';

const router = Router();

// Validation schemas
const fileUploadSchema = z.object({
  uploadType: z.enum(['quotes', 'projects', 'suppliers', 'general']).default('general'),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  description: z.string().max(500).optional()
});

const fileUpdateSchema = z.object({
  description: z.string().max(500).optional(),
  is_active: z.boolean().optional()
});

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * @swagger
 * /api/v1/files/upload:
 *   post:
 *     summary: Upload single file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               uploadType:
 *                 type: string
 *                 enum: [quotes, projects, suppliers, general]
 *               entityType:
 *                 type: string
 *               entityId:
 *                 type: string
 *                 format: uuid
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large
 */
router.post('/upload', authenticateTenant, uploadSingle('file'), validateFileUpload, async (req, res) => {
  try {
    const { uploadType, entityType, entityId, description } = fileUploadSchema.parse(req.body);
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'No file uploaded'
        }
      });
    }

    const fileId = uuidv4();
    const userId = (req as any).userId;
    const workspaceId = (req as any).workspaceId;

    // Insert file record into database
    const result = await pool.query(
      `INSERT INTO files (id, workspace_id, user_id, filename, original_filename, 
       file_path, file_size, file_type, upload_type, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        fileId,
        workspaceId,
        userId,
        file.filename,
        file.originalname,
        file.path,
        file.size,
        file.mimetype,
        uploadType,
        entityType || null,
        entityId || null,
        description || null
      ]
    );

    logger.info({ fileId, userId, workspaceId, filename: file.filename }, 'File uploaded successfully');

    res.status(201).json({
      data: result.rows[0]
    });
  } catch (error) {
    logger.error({ error }, 'File upload error');
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'File upload failed'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/files/upload-multiple:
 *   post:
 *     summary: Upload multiple files
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               uploadType:
 *                 type: string
 *                 enum: [quotes, projects, suppliers, general]
 *               entityType:
 *                 type: string
 *               entityId:
 *                 type: string
 *                 format: uuid
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/upload-multiple', authenticateTenant, uploadMultiple('files', 5), validateFileUpload, async (req, res) => {
  try {
    const { uploadType, entityType, entityId, description } = fileUploadSchema.parse(req.body);
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: {
          code: 'NO_FILES_UPLOADED',
          message: 'No files uploaded'
        }
      });
    }

    const userId = (req as any).userId;
    const workspaceId = (req as any).workspaceId;
    const uploadedFiles = [];

    for (const file of files) {
      const fileId = uuidv4();
      
      const result = await pool.query(
        `INSERT INTO files (id, workspace_id, user_id, filename, original_filename, 
         file_path, file_size, file_type, upload_type, entity_type, entity_id, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          fileId,
          workspaceId,
          userId,
          file.filename,
          file.originalname,
          file.path,
          file.size,
          file.mimetype,
          uploadType,
          entityType || null,
          entityId || null,
          description || null
        ]
      );

      uploadedFiles.push(result.rows[0]);
      logger.info({ fileId, userId, workspaceId, filename: file.filename }, 'File uploaded successfully');
    }

    res.status(201).json({
      data: uploadedFiles
    });
  } catch (error) {
    logger.error({ error }, 'Multiple file upload error');
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Multiple file upload failed'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/files/{id}:
 *   get:
 *     summary: Get file by ID
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: File retrieved successfully
 *       404:
 *         description: File not found
 */
router.get('/:id', authenticateTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = (req as any).workspaceId;

    const result = await pool.query(
      'SELECT * FROM files WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        }
      });
    }

    res.json({
      data: result.rows[0]
    });
  } catch (error) {
    logger.error({ error }, 'Get file error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve file'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/files/{id}/download:
 *   get:
 *     summary: Download file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *       404:
 *         description: File not found
 */
router.get('/:id/download', authenticateTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = (req as any).workspaceId;

    const result = await pool.query(
      'SELECT * FROM files WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        }
      });
    }

    const file = result.rows[0];
    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND_ON_DISK',
          message: 'File not found on disk'
        }
      });
    }

    res.download(file.file_path, file.original_filename);
  } catch (error) {
    logger.error({ error }, 'Download file error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to download file'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/files:
 *   get:
 *     summary: List files
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: uploadType
 *         schema:
 *           type: string
 *           enum: [quotes, projects, suppliers, general]
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 */
router.get('/', authenticateTenant, async (req, res) => {
  try {
    const { uploadType, entityType, entityId } = req.query;
    const workspaceId = (req as any).workspaceId;

    let query = 'SELECT * FROM files WHERE workspace_id = $1';
    const params: any[] = [workspaceId];
    let paramCount = 1;

    if (uploadType) {
      paramCount++;
      query += ` AND upload_type = $${paramCount}`;
      params.push(uploadType);
    }

    if (entityType) {
      paramCount++;
      query += ` AND entity_type = $${paramCount}`;
      params.push(entityType);
    }

    if (entityId) {
      paramCount++;
      query += ` AND entity_id = $${paramCount}`;
      params.push(entityId);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      data: result.rows
    });
  } catch (error) {
    logger.error({ error }, 'List files error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve files'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/files/{id}:
 *   delete:
 *     summary: Delete file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       404:
 *         description: File not found
 */
router.delete('/:id', authenticateTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = (req as any).workspaceId;

    const result = await pool.query(
      'SELECT * FROM files WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        }
      });
    }

    const file = result.rows[0];
    const fs = require('fs');

    // Delete file from disk
    if (fs.existsSync(file.file_path)) {
      fs.unlinkSync(file.file_path);
    }

    // Delete from database
    await pool.query('DELETE FROM files WHERE id = $1', [id]);

    logger.info({ fileId: id, workspaceId }, 'File deleted successfully');

    res.json({
      message: 'File deleted successfully'
    });
  } catch (error) {
    logger.error({ error }, 'Delete file error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete file'
      }
    });
  }
});

export default router;
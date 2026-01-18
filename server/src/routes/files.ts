import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db/connection.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

export const filesRouter = Router();

// Configure multer for file uploads
const storagePath = process.env.STORAGE_PATH || './uploads';
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const userId = (req as AuthRequest).userId;
        const userDir = path.join(storagePath, userId!);
        await fs.mkdir(userDir, { recursive: true });
        cb(null, userDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `${uuidv4()}${ext}`;
        cb(null, filename);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/epub+zip',
            'text/html',
            'text/markdown',
            'text/plain',
        ];
        if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.epub')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    },
});

// All file routes require authentication
filesRouter.use(authMiddleware);

const checkPaidTier = async (req: AuthRequest, res: any, next: any) => {
    try {
        const pool = getPool();
        const result = await pool.query('SELECT subscription_tier FROM users WHERE id = $1', [req.userId]);

        if (result.rows.length === 0 || result.rows[0].subscription_tier === 'free') {
            throw createError('File uploads require a paid subscription', 403, 'PAYMENT_REQUIRED');
        }
        next();
    } catch (e) {
        next(e);
    }
};

// Upload a file
filesRouter.post('/', checkPaidTier, upload.single('file'), async (req: AuthRequest, res, next) => {
    try {
        if (!req.file) {
            throw createError('No file uploaded', 400, 'NO_FILE');
        }

        const pool = getPool();
        const fileId = uuidv4();
        const storagePath = req.file.path;

        await pool.query(`
      INSERT INTO files (id, user_id, filename, content_type, size_bytes, storage_path)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
            fileId,
            req.userId,
            req.file.originalname,
            req.file.mimetype,
            req.file.size,
            storagePath,
        ]);

        res.status(201).json({
            id: fileId,
            filename: req.file.originalname,
            contentType: req.file.mimetype,
            size: req.file.size,
        });
    } catch (error) {
        next(error);
    }
});

// Download a file
filesRouter.get('/:id', async (req: AuthRequest, res, next) => {
    try {
        const pool = getPool();
        const result = await pool.query(`
      SELECT * FROM files WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.userId]);

        if (result.rows.length === 0) {
            throw createError('File not found', 404, 'FILE_NOT_FOUND');
        }

        const file = result.rows[0];
        res.download(file.storage_path, file.filename);
    } catch (error) {
        next(error);
    }
});

// Delete a file
filesRouter.delete('/:id', async (req: AuthRequest, res, next) => {
    try {
        const pool = getPool();
        const result = await pool.query(`
      SELECT * FROM files WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.userId]);

        if (result.rows.length === 0) {
            throw createError('File not found', 404, 'FILE_NOT_FOUND');
        }

        const file = result.rows[0];

        // Delete from disk
        try {
            await fs.unlink(file.storage_path);
        } catch (e) {
            console.warn('File already deleted from disk:', file.storage_path);
        }

        // Delete from database
        await pool.query('DELETE FROM files WHERE id = $1', [req.params.id]);

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// List user's files
filesRouter.get('/', async (req: AuthRequest, res, next) => {
    try {
        const pool = getPool();
        const result = await pool.query(`
      SELECT id, filename, content_type, size_bytes, created_at
      FROM files WHERE user_id = $1 ORDER BY created_at DESC
    `, [req.userId]);

        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

import { Router } from 'express';
import { getPool } from '../db/connection.js';
import { authMiddleware, AuthRequest, optionalAuthMiddleware } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

export const documentsRouter = Router();

// Get a single document by ID (public endpoint but returns limited data for non-owners)
documentsRouter.get('/:id', optionalAuthMiddleware, async (req: AuthRequest, res, next) => {
    try {
        const pool = getPool();
        const { id } = req.params;
        const userId = req.userId;

        // Query document, filtering by user if authenticated
        const result = await pool.query(`
            SELECT id, title, file_path, file_type, content, content_hash,
                   total_pages, current_page, current_scroll_percent, current_cfi,
                   category, tags, date_added, date_modified, date_last_reviewed,
                   extract_count, learning_item_count, priority_rating,
                   priority_slider, priority_score, is_archived, is_favorite,
                   metadata, next_reading_date, reading_count, stability,
                   difficulty, reps, total_time_spent, deleted_at
            FROM documents 
            WHERE id = $1 ${userId ? 'AND user_id = $2' : ''}
        `, userId ? [id, userId] : [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// Update document reading progress (lightweight endpoint for position persistence)
documentsRouter.post('/:id/progress', authMiddleware, async (req: AuthRequest, res, next) => {
    try {
        const pool = getPool();
        const { id } = req.params;
        const userId = req.userId!;
        const { current_page, current_scroll_percent, current_cfi } = req.body;

        // Update only the progress fields
        const result = await pool.query(`
            UPDATE documents 
            SET current_page = COALESCE($3, current_page),
                current_scroll_percent = COALESCE($4, current_scroll_percent),
                current_cfi = COALESCE($5, current_cfi),
                date_modified = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING id, current_page, current_scroll_percent, current_cfi
        `, [id, userId, current_page, current_scroll_percent, current_cfi]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found or not owned by user' });
        }

        res.json({ success: true, ...result.rows[0] });
    } catch (error) {
        next(error);
    }
});

import { Router } from 'express';
import { getPool } from '../db/connection.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

export const syncRouter = Router();

// All sync routes require authentication
syncRouter.use(authMiddleware);

interface SyncPullResponse {
    documents: unknown[];
    extracts: unknown[];
    learningItems: unknown[];
    syncVersion: number;
}

// Pull changes since last sync
syncRouter.get('/pull', async (req: AuthRequest, res, next) => {
    try {
        const pool = getPool();
        const userId = req.userId!;
        const since = parseInt(req.query.since as string) || 0;

        // Get current max sync version
        const versionResult = await pool.query(`
      SELECT GREATEST(
        COALESCE((SELECT MAX(sync_version) FROM documents WHERE user_id = $1), 0),
        COALESCE((SELECT MAX(sync_version) FROM extracts WHERE user_id = $1), 0),
        COALESCE((SELECT MAX(sync_version) FROM learning_items WHERE user_id = $1), 0)
      ) as max_version
    `, [userId]);
        const currentVersion = versionResult.rows[0].max_version || 0;

        // Get changed documents
        const documents = await pool.query(`
      SELECT * FROM documents 
      WHERE user_id = $1 AND sync_version > $2
      ORDER BY sync_version
    `, [userId, since]);

        // Get changed extracts
        const extracts = await pool.query(`
      SELECT * FROM extracts 
      WHERE user_id = $1 AND sync_version > $2
      ORDER BY sync_version
    `, [userId, since]);

        // Get changed learning items
        const learningItems = await pool.query(`
      SELECT * FROM learning_items 
      WHERE user_id = $1 AND sync_version > $2
      ORDER BY sync_version
    `, [userId, since]);

        const response: SyncPullResponse = {
            documents: documents.rows,
            extracts: extracts.rows,
            learningItems: learningItems.rows,
            syncVersion: currentVersion,
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

interface SyncPushPayload {
    documents?: unknown[];
    extracts?: unknown[];
    learningItems?: unknown[];
}

// Push local changes to server
syncRouter.post('/push', async (req: AuthRequest, res, next) => {
    try {
        const pool = getPool();
        const userId = req.userId!;
        const payload: SyncPushPayload = req.body;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get next sync version
            const versionResult = await client.query(`
        SELECT GREATEST(
          COALESCE((SELECT MAX(sync_version) FROM documents WHERE user_id = $1), 0),
          COALESCE((SELECT MAX(sync_version) FROM extracts WHERE user_id = $1), 0),
          COALESCE((SELECT MAX(sync_version) FROM learning_items WHERE user_id = $1), 0)
        ) + 1 as next_version
      `, [userId]);
            let nextVersion = versionResult.rows[0].next_version;

            // Upsert documents
            if (payload.documents?.length) {
                for (const doc of payload.documents as any[]) {
                    await client.query(`
            INSERT INTO documents (
              id, user_id, title, file_path, file_type, content, content_hash,
              total_pages, current_page, category, tags, date_added, date_modified,
              date_last_reviewed, extract_count, learning_item_count, priority_rating,
              priority_slider, priority_score, is_archived, is_favorite, metadata,
              next_reading_date, reading_count, stability, difficulty, reps,
              total_time_spent, deleted_at, sync_version
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              file_path = EXCLUDED.file_path,
              file_type = EXCLUDED.file_type,
              content = EXCLUDED.content,
              content_hash = EXCLUDED.content_hash,
              total_pages = EXCLUDED.total_pages,
              current_page = EXCLUDED.current_page,
              category = EXCLUDED.category,
              tags = EXCLUDED.tags,
              date_modified = EXCLUDED.date_modified,
              date_last_reviewed = EXCLUDED.date_last_reviewed,
              extract_count = EXCLUDED.extract_count,
              learning_item_count = EXCLUDED.learning_item_count,
              priority_rating = EXCLUDED.priority_rating,
              priority_slider = EXCLUDED.priority_slider,
              priority_score = EXCLUDED.priority_score,
              is_archived = EXCLUDED.is_archived,
              is_favorite = EXCLUDED.is_favorite,
              metadata = EXCLUDED.metadata,
              next_reading_date = EXCLUDED.next_reading_date,
              reading_count = EXCLUDED.reading_count,
              stability = EXCLUDED.stability,
              difficulty = EXCLUDED.difficulty,
              reps = EXCLUDED.reps,
              total_time_spent = EXCLUDED.total_time_spent,
              deleted_at = EXCLUDED.deleted_at,
              sync_version = EXCLUDED.sync_version
          `, [
                        doc.id, userId, doc.title, doc.file_path, doc.file_type,
                        doc.content, doc.content_hash, doc.total_pages, doc.current_page,
                        doc.category, JSON.stringify(doc.tags || []), doc.date_added,
                        doc.date_modified, doc.date_last_reviewed, doc.extract_count,
                        doc.learning_item_count, doc.priority_rating, doc.priority_slider,
                        doc.priority_score, doc.is_archived, doc.is_favorite,
                        doc.metadata ? JSON.stringify(doc.metadata) : null,
                        doc.next_reading_date, doc.reading_count, doc.stability,
                        doc.difficulty, doc.reps, doc.total_time_spent, doc.deleted_at,
                        nextVersion++
                    ]);
                }
            }

            // Upsert extracts
            if (payload.extracts?.length) {
                for (const ext of payload.extracts as any[]) {
                    await client.query(`
            INSERT INTO extracts (
              id, user_id, document_id, content, page_title, page_number,
              highlight_color, notes, progressive_disclosure_level, max_disclosure_level,
              date_created, date_modified, tags, category, memory_state_stability,
              memory_state_difficulty, next_review_date, last_review_date,
              review_count, reps, deleted_at, sync_version
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            ON CONFLICT (id) DO UPDATE SET
              content = EXCLUDED.content,
              page_title = EXCLUDED.page_title,
              page_number = EXCLUDED.page_number,
              highlight_color = EXCLUDED.highlight_color,
              notes = EXCLUDED.notes,
              progressive_disclosure_level = EXCLUDED.progressive_disclosure_level,
              max_disclosure_level = EXCLUDED.max_disclosure_level,
              date_modified = EXCLUDED.date_modified,
              tags = EXCLUDED.tags,
              category = EXCLUDED.category,
              memory_state_stability = EXCLUDED.memory_state_stability,
              memory_state_difficulty = EXCLUDED.memory_state_difficulty,
              next_review_date = EXCLUDED.next_review_date,
              last_review_date = EXCLUDED.last_review_date,
              review_count = EXCLUDED.review_count,
              reps = EXCLUDED.reps,
              deleted_at = EXCLUDED.deleted_at,
              sync_version = EXCLUDED.sync_version
          `, [
                        ext.id, userId, ext.document_id, ext.content, ext.page_title,
                        ext.page_number, ext.highlight_color, ext.notes,
                        ext.progressive_disclosure_level, ext.max_disclosure_level,
                        ext.date_created, ext.date_modified, JSON.stringify(ext.tags || []),
                        ext.category, ext.memory_state?.stability, ext.memory_state?.difficulty,
                        ext.next_review_date, ext.last_review_date, ext.review_count,
                        ext.reps, ext.deleted_at, nextVersion++
                    ]);
                }
            }

            // Upsert learning items
            if (payload.learningItems?.length) {
                for (const item of payload.learningItems as any[]) {
                    await client.query(`
            INSERT INTO learning_items (
              id, user_id, extract_id, document_id, item_type, question, answer,
              cloze_text, difficulty, interval, ease_factor, due_date, date_created,
              date_modified, last_review_date, review_count, lapses, state,
              is_suspended, tags, memory_state_stability, memory_state_difficulty,
              deleted_at, sync_version
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
            ON CONFLICT (id) DO UPDATE SET
              extract_id = EXCLUDED.extract_id,
              document_id = EXCLUDED.document_id,
              item_type = EXCLUDED.item_type,
              question = EXCLUDED.question,
              answer = EXCLUDED.answer,
              cloze_text = EXCLUDED.cloze_text,
              difficulty = EXCLUDED.difficulty,
              interval = EXCLUDED.interval,
              ease_factor = EXCLUDED.ease_factor,
              due_date = EXCLUDED.due_date,
              date_modified = EXCLUDED.date_modified,
              last_review_date = EXCLUDED.last_review_date,
              review_count = EXCLUDED.review_count,
              lapses = EXCLUDED.lapses,
              state = EXCLUDED.state,
              is_suspended = EXCLUDED.is_suspended,
              tags = EXCLUDED.tags,
              memory_state_stability = EXCLUDED.memory_state_stability,
              memory_state_difficulty = EXCLUDED.memory_state_difficulty,
              deleted_at = EXCLUDED.deleted_at,
              sync_version = EXCLUDED.sync_version
          `, [
                        item.id, userId, item.extract_id, item.document_id, item.item_type,
                        item.question, item.answer, item.cloze_text, item.difficulty,
                        item.interval, item.ease_factor, item.due_date, item.date_created,
                        item.date_modified, item.last_review_date, item.review_count,
                        item.lapses, item.state, item.is_suspended,
                        JSON.stringify(item.tags || []), item.memory_state?.stability,
                        item.memory_state?.difficulty, item.deleted_at, nextVersion++
                    ]);
                }
            }

            // Update sync cursor
            await client.query(`
        UPDATE sync_cursors SET last_sync_version = $1, last_sync_at = NOW()
        WHERE user_id = $2
      `, [nextVersion - 1, userId]);

            await client.query('COMMIT');

            res.json({
                success: true,
                syncVersion: nextVersion - 1,
                pushed: {
                    documents: payload.documents?.length || 0,
                    extracts: payload.extracts?.length || 0,
                    learningItems: payload.learningItems?.length || 0,
                }
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        next(error);
    }
});

// Get sync status
syncRouter.get('/status', async (req: AuthRequest, res, next) => {
    try {
        const pool = getPool();
        const userId = req.userId!;

        const result = await pool.query(`
      SELECT last_sync_version, last_sync_at FROM sync_cursors WHERE user_id = $1
    `, [userId]);

        if (result.rows.length === 0) {
            res.json({ lastSyncVersion: 0, lastSyncAt: null });
        } else {
            res.json({
                lastSyncVersion: result.rows[0].last_sync_version,
                lastSyncAt: result.rows[0].last_sync_at,
            });
        }
    } catch (error) {
        next(error);
    }
});

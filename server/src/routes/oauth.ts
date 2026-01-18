import { Router } from 'express';
import { createError } from '../middleware/errorHandler.js';

export const oauthRouter = Router();

// OAuth initiation
oauthRouter.get('/:provider', (req, res, next) => {
    const { provider } = req.params;
    // TODO: Implement provider-specific redirect logic (Google, GitHub)
    // Construct auth URL and redirect
    res.status(501).json({ message: `OAuth for ${provider} not implemented yet` });
});

// OAuth callback
oauthRouter.get('/:provider/callback', async (req, res, next) => {
    const { provider } = req.params;
    const { code } = req.query;

    try {
        if (!code) throw createError('No code provided', 400, 'INVALID_REQUEST');

        // TODO: Exchange code for token
        // TODO: Find/Create user
        // TODO: Issue JWT
        // TODO: Redirect to frontend with token

        res.status(501).json({ message: 'OAuth callback not implemented yet' });
    } catch (error) {
        next(error);
    }
});

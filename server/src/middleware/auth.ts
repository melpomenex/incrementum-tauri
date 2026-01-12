import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler.js';

export interface AuthRequest extends Request {
    userId?: string;
}

export function authMiddleware(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw createError('No token provided', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.slice(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw createError('JWT_SECRET not configured', 500, 'CONFIG_ERROR');
    }

    try {
        const payload = jwt.verify(token, secret) as { userId: string };
        req.userId = payload.userId;
        next();
    } catch (error) {
        throw createError('Invalid token', 401, 'INVALID_TOKEN');
    }
}

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getPool } from '../db/connection.js';
import { createError } from '../middleware/errorHandler.js';

export const authRouter = Router();

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

// Register new user
authRouter.post('/register', async (req, res, next) => {
    try {
        const { email, password } = registerSchema.parse(req.body);
        const pool = getPool();

        // Check if user exists
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existing.rows.length > 0) {
            throw createError('Email already registered', 400, 'EMAIL_EXISTS');
        }

        // Hash password and create user
        const passwordHash = await bcrypt.hash(password, 12);
        const userId = uuidv4();

        await pool.query(
            'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)',
            [userId, email.toLowerCase(), passwordHash]
        );

        // Initialize sync cursor
        await pool.query(
            'INSERT INTO sync_cursors (user_id) VALUES ($1)',
            [userId]
        );

        // Generate token
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw createError('JWT_SECRET not configured', 500, 'CONFIG_ERROR');
        }
        const token = jwt.sign(
            { userId },
            secret,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: { id: userId, email: email.toLowerCase() },
        });
    } catch (error) {
        next(error);
    }
});

// Login
authRouter.post('/login', async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const pool = getPool();

        const result = await pool.query(
            'SELECT id, password_hash FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw createError('JWT_SECRET not configured', 500, 'CONFIG_ERROR');
        }
        const token = jwt.sign(
            { userId: user.id },
            secret,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: user.id, email: email.toLowerCase() },
        });
    } catch (error) {
        next(error);
    }
});

// Verify token (used by clients to check auth status)
authRouter.get('/verify', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw createError('No token', 401, 'NO_TOKEN');
        }

        const token = authHeader.slice(7);
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

        const pool = getPool();
        const result = await pool.query(
            'SELECT id, email FROM users WHERE id = $1',
            [payload.userId]
        );

        if (result.rows.length === 0) {
            throw createError('User not found', 404, 'USER_NOT_FOUND');
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

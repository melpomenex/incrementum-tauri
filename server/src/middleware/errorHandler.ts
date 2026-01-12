import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
    statusCode?: number;
    code?: string;
}

export function errorHandler(
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    console.error('Error:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        error: {
            message,
            code: err.code,
        },
    });
}

export function createError(message: string, statusCode: number, code?: string): AppError {
    const error: AppError = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

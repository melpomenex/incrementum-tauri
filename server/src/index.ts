import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { authRouter } from './routes/auth.js';
import { syncRouter } from './routes/sync.js';
import { filesRouter } from './routes/files.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initDatabase } from './db/connection.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Parse CORS origins from environment
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:15173'];

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: corsOrigins,
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRouter);
app.use('/sync', syncRouter);
app.use('/files', filesRouter);

// Error handling
app.use(errorHandler);

// Start server
async function start() {
    try {
        await initDatabase();
        console.log('Database connected');

        app.listen(PORT, () => {
            console.log(`Sync server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();

export { app };

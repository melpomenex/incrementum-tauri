import pg from 'pg';
const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
    if (!pool) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return pool;
}

export async function initDatabase(): Promise<void> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is required');
    }

    pool = new Pool({
        connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    // Test connection
    const client = await pool.connect();
    try {
        await client.query('SELECT NOW()');
    } finally {
        client.release();
    }
}

export async function closeDatabase(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

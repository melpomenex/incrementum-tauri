import 'dotenv/config';
import { initDatabase } from './connection.js';
import { migrate } from './schema.js';

async function main() {
    await initDatabase();
    await migrate();
    console.log('Migration completed successfully');
    process.exit(0);
}

main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});

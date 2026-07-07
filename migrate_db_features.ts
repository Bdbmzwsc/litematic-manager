import pool from './server/config/database.js';

async function migrate() {
    try {
        console.log('Adding avatar_url and bio to users table...');
        await pool.query('ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) DEFAULT NULL, ADD COLUMN bio TEXT DEFAULT NULL');
        console.log('Successfully altered users table');
    } catch (e) {
        console.log('Skipping users table alter, might already exist', (e as Error).message);
    }
    
    try {
        console.log('Adding tags to schematics table...');
        await pool.query('ALTER TABLE schematics ADD COLUMN tags JSON DEFAULT NULL');
        console.log('Successfully altered schematics table');
    } catch (e) {
        console.log('Skipping schematics table alter, might already exist', (e as Error).message);
    }
    process.exit();
}

migrate();
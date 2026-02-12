const pool = require('./server/config/database');

async function migrate() {
    try {
        console.log('Starting migration...');

        // Check if column exists
        const [columns] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'schematics' AND COLUMN_NAME = 'folder_name'
        `, [process.env.DB_NAME || 'litematic']);

        if (columns.length > 0) {
            console.log('Column folder_name already exists. Skipping.');
        } else {
            console.log('Adding folder_name column...');
            await pool.query('ALTER TABLE schematics ADD COLUMN folder_name VARCHAR(255) DEFAULT NULL');
            console.log('Migration successful: folder_name column added.');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        // Force exit to close connection
        process.exit();
    }
}

migrate();

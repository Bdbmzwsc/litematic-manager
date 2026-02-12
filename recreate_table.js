const pool = require('./server/config/database');

async function recreateTable() {
    try {
        console.log('Starting table recreation...');

        // 1. Drop existing table
        console.log('Dropping existing table...');
        await pool.query('DROP TABLE IF EXISTS schematics');

        // 2. Create new table
        // We include all original columns to satisfy any legacy code that might query them,
        // even if we only use folder_name for new logic.
        // Added folder_name column definition.
        const createTableQuery = `
            CREATE TABLE schematics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                folder_name VARCHAR(255) DEFAULT NULL,
                file_path VARCHAR(255) DEFAULT NULL,
                top_view_path VARCHAR(255) DEFAULT NULL,
                side_view_path VARCHAR(255) DEFAULT NULL,
                front_view_path VARCHAR(255) DEFAULT NULL,
                materials TEXT,
                user_id INT NOT NULL,
                is_public BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                readme_path VARCHAR(255) DEFAULT NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        console.log('Creating new table...');
        await pool.query(createTableQuery);

        console.log('Table schematics recreated successfully.');

    } catch (error) {
        console.error('Recreation failed:', error);
    } finally {
        process.exit();
    }
}

recreateTable();

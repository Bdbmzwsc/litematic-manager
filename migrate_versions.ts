import pool from './server/config/database.js';

async function migrate() {
    try {
        console.log('Creating schematic_versions table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS schematic_versions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                schematic_id INT NOT NULL,
                version_name VARCHAR(50) NOT NULL,
                folder_name VARCHAR(255) NOT NULL,
                changelog TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (schematic_id) REFERENCES schematics(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('Successfully created schematic_versions table');
    } catch (e) {
        console.error('Failed to create schematic_versions table:', e);
    }
    process.exit();
}

migrate();
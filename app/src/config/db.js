const mysql = require('mysql2/promise');

// Configuración de conexión usando las mismas variables de entorno que MySQL
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'mi_base',
  ssl: process.env.MYSQL_SSL === 'false' ? false : { rejectUnauthorized: false },
};

let pool;

async function initDB() {
  pool = mysql.createPool(dbConfig);

  // Crear la tabla si no existe — with pinned and category columns
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS notas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      titulo VARCHAR(255) NOT NULL,
      contenido TEXT,
      pinned BOOLEAN DEFAULT FALSE,
      category VARCHAR(20) DEFAULT 'nebula',
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add columns if upgrading from old schema
  try {
    await pool.execute(`ALTER TABLE notas ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE`);
    await pool.execute(`ALTER TABLE notas ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'nebula'`);
  } catch (e) {
    // Columns might already exist — ignore
  }

  console.log('Tabla "notas" lista.');
}

function getPool() {
  return pool;
}

module.exports = { dbConfig, initDB, getPool };

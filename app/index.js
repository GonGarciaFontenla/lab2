const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

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

  // Crear la tabla si no existe
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS notas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      titulo VARCHAR(255) NOT NULL,
      contenido TEXT,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Tabla "notas" lista.');
}

// Página principal: formulario + listado de notas
app.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM notas ORDER BY creado_en DESC');
    let html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notas - Inter Lab</title>
        <style>
          body { font-family: sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; }
          h1 { color: #333; }
          form { background: #f4f4f4; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          input, textarea { width: 100%; padding: 8px; margin: 8px 0; box-sizing: border-box; }
          button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background: #0056b3; }
          .nota { border-bottom: 1px solid #ddd; padding: 15px 0; }
          .nota h3 { margin: 0 0 5px; }
          .nota small { color: #888; }
          .info { background: #e8f5e9; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>Notas</h1>
        <div class="info">
          Conectado a: <strong>${dbConfig.host}</strong> | DB: <strong>${dbConfig.database}</strong> | Usuario: <strong>${dbConfig.user}</strong>
        </div>
        <form method="POST" action="/notas">
          <input type="text" name="titulo" placeholder="Título de la nota" required>
          <textarea name="contenido" rows="3" placeholder="Contenido (opcional)"></textarea>
          <button type="submit">Guardar nota</button>
        </form>
        <h2>Notas guardadas (${rows.length})</h2>
    `;
    for (const nota of rows) {
      html += `
        <div class="nota">
          <h3>${nota.titulo}</h3>
          <p>${nota.contenido || '<em>Sin contenido</em>'}</p>
          <small>${nota.creado_en.toLocaleString()}</small>
        </div>
      `;
    }
    html += '</body></html>';
    res.send(html);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

// Crear nota
app.post('/notas', async (req, res) => {
  try {
    const { titulo, contenido } = req.body;
    await pool.execute('INSERT INTO notas (titulo, contenido) VALUES (?, ?)', [titulo, contenido || null]);
    res.redirect('/');
  } catch (err) {
    res.status(500).send(`Error al guardar: ${err.message}`);
  }
});

// Iniciar
initDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`App corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error al conectar a MySQL:', err.message);
    console.error('Verificá que las variables de entorno sean correctas y que MySQL esté corriendo.');
    process.exit(1);
  });

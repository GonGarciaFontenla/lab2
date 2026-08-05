const express = require('express');
const path = require('path');
const { initDB } = require('./src/config/db');
const notasRouter = require('./src/routes/notas');
 
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', notasRouter);

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

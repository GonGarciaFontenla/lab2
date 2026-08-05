const express = require('express');
const { getPool } = require('../config/db');
const { CATEGORIES } = require('../helpers');
const { renderPage } = require('../views/page');

const router = express.Router();

// Página principal: formulario + listado de notas
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM notas ORDER BY creado_en DESC');
    res.send(renderPage(rows));
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

// Crear nota
router.post('/notas', async (req, res) => {
  try {
    const pool = getPool();
    const { titulo, contenido, category } = req.body;
    const cat = CATEGORIES[category] ? category : 'nebula';
    await pool.execute(
      'INSERT INTO notas (titulo, contenido, category) VALUES (?, ?, ?)',
      [titulo, contenido || null, cat]
    );
    res.redirect('/');
  } catch (err) {
    res.status(500).send(`Error al guardar: ${err.message}`);
  }
});

// Actualizar nota (inline edit)
router.put('/notas/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { titulo, contenido } = req.body;
    await pool.execute(
      'UPDATE notas SET titulo = ?, contenido = ? WHERE id = ?',
      [titulo, contenido || null, id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle pin
router.patch('/notas/:id/pin', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT pinned FROM notas WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const newPinned = !rows[0].pinned;
    await pool.execute('UPDATE notas SET pinned = ? WHERE id = ?', [newPinned, id]);
    res.json({ ok: true, pinned: newPinned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar nota
router.delete('/notas/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    await pool.execute('DELETE FROM notas WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

// ─── Helper: escape HTML to prevent XSS ────────────────────────────────
function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Helper: time ago ──────────────────────────────────────────────────
function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString('es-AR');
}

// ─── Category colors ──────────────────────────────────────────────────
const CATEGORIES = {
  nebula:  { label: 'Nebula',  gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: '#a855f7' },
  aurora:  { label: 'Aurora',  gradient: 'linear-gradient(135deg, #22d3ee, #06b6d4)', color: '#22d3ee' },
  solar:   { label: 'Solar',   gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#fbbf24' },
  nova:    { label: 'Nova',    gradient: 'linear-gradient(135deg, #f472b6, #ec4899)', color: '#f472b6' },
  cosmos:  { label: 'Cosmos',  gradient: 'linear-gradient(135deg, #34d399, #10b981)', color: '#34d399' },
};

// ─── Render the full page ──────────────────────────────────────────────
function renderPage(rows) {
  const noteCount = rows.length;
  const todayCount = rows.filter(n => {
    const d = new Date(n.creado_en);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;
  const totalChars = rows.reduce((sum, n) => sum + (n.contenido ? n.contenido.length : 0) + n.titulo.length, 0);
  const totalWords = rows.reduce((sum, n) => {
    const text = ((n.titulo || '') + ' ' + (n.contenido || '')).trim();
    return sum + (text ? text.split(/\s+/).length : 0);
  }, 0);
  const pinnedCount = rows.filter(n => n.pinned).length;

  // Sort: pinned first, then by date
  const sortedRows = [...rows].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.creado_en) - new Date(a.creado_en);
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Cosmos Notes — A stunning sci-fi note-taking experience powered by the stars">
  <title>Cosmos Notes ✦</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    /* ═══════════════════════════════════════════════════════════
       COSMOS NOTES v2.0 — Ultra Premium Design System
       ═══════════════════════════════════════════════════════════ */

    :root {
      /* Core palette */
      --void: #050510;
      --deep-space: #08081a;
      --nebula-dark: #0b0b22;
      --nebula-mid: #10102c;
      --star-dust: #181844;

      /* Accent neons */
      --cyan-glow: #00f0ff;
      --cyan-dim: #00b8c9;
      --purple-glow: #a855f7;
      --purple-dim: #7c3aed;
      --pink-glow: #f472b6;
      --amber-glow: #fbbf24;
      --green-glow: #34d399;

      /* Text */
      --text-primary: #eaecf5;
      --text-secondary: #8892b0;
      --text-muted: #4a5078;

      /* Glass */
      --glass-bg: rgba(12, 12, 36, 0.6);
      --glass-bg-hover: rgba(16, 16, 48, 0.7);
      --glass-border: rgba(0, 240, 255, 0.1);
      --glass-border-hover: rgba(0, 240, 255, 0.22);

      /* Sizing */
      --radius-sm: 10px;
      --radius-md: 16px;
      --radius-lg: 22px;
      --radius-xl: 30px;

      /* Transitions */
      --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
      --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* ─── Reset ──────────────────────────────────────────── */
    *, *::before, *::after {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--void);
      color: var(--text-primary);
      min-height: 100vh;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* ─── Starfield Canvas ───────────────────────────────── */
    #starfield {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
    }

    /* ─── Ambient Nebula Glow (Parallax-reactive) ───────── */
    .nebula-orb {
      position: fixed;
      border-radius: 50%;
      filter: blur(130px);
      opacity: 0.13;
      pointer-events: none;
      z-index: 0;
      animation: nebulaPulse 10s ease-in-out infinite alternate;
      transition: transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1);
    }
    .nebula-orb--cyan {
      width: 550px;
      height: 550px;
      background: radial-gradient(circle, var(--cyan-glow), transparent 70%);
      top: -120px;
      right: -120px;
    }
    .nebula-orb--purple {
      width: 650px;
      height: 650px;
      background: radial-gradient(circle, var(--purple-glow), transparent 70%);
      bottom: -220px;
      left: -170px;
      animation-delay: 3s;
    }
    .nebula-orb--pink {
      width: 350px;
      height: 350px;
      background: radial-gradient(circle, var(--pink-glow), transparent 70%);
      top: 45%;
      left: 55%;
      animation-delay: 6s;
    }
    .nebula-orb--green {
      width: 280px;
      height: 280px;
      background: radial-gradient(circle, var(--green-glow), transparent 70%);
      top: 20%;
      left: 10%;
      animation-delay: 4s;
      opacity: 0.08;
    }

    @keyframes nebulaPulse {
      0%   { opacity: 0.08; transform: scale(1) translate(0, 0); }
      100% { opacity: 0.18; transform: scale(1.12) translate(10px, -8px); }
    }

    /* ─── Grid Overlay (very subtle) ────────────────────── */
    .grid-overlay {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background-image:
        linear-gradient(rgba(0, 240, 255, 0.015) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 240, 255, 0.015) 1px, transparent 1px);
      background-size: 80px 80px;
      mask-image: radial-gradient(ellipse 60% 60% at 50% 40%, black 20%, transparent 70%);
      -webkit-mask-image: radial-gradient(ellipse 60% 60% at 50% 40%, black 20%, transparent 70%);
    }

    /* ─── Main Layout ────────────────────────────────────── */
    .cosmos-app {
      position: relative;
      z-index: 1;
      max-width: 920px;
      margin: 0 auto;
      padding: 36px 28px 100px;
    }

    /* ─── Header / Brand ─────────────────────────────────── */
    .cosmos-header {
      text-align: center;
      margin-bottom: 44px;
      animation: fadeInDown 0.9s var(--ease-spring);
    }

    .cosmos-logo {
      display: inline-flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 10px;
    }

    .cosmos-logo__icon {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--cyan-glow), var(--purple-glow));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      box-shadow:
        0 0 30px rgba(0, 240, 255, 0.3),
        0 0 60px rgba(168, 85, 247, 0.15),
        inset 0 0 20px rgba(255, 255, 255, 0.1);
      animation: iconPulse 4s ease-in-out infinite;
      position: relative;
    }

    .cosmos-logo__icon::after {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      background: conic-gradient(from 0deg, var(--cyan-glow), var(--purple-glow), var(--pink-glow), var(--cyan-glow));
      z-index: -1;
      opacity: 0.5;
      animation: orbitRing 6s linear infinite;
    }

    @keyframes orbitRing {
      to { transform: rotate(360deg); }
    }

    @keyframes iconPulse {
      0%, 100% { box-shadow: 0 0 30px rgba(0, 240, 255, 0.3), 0 0 60px rgba(168, 85, 247, 0.15); }
      50%      { box-shadow: 0 0 45px rgba(0, 240, 255, 0.45), 0 0 90px rgba(168, 85, 247, 0.2); }
    }

    .cosmos-logo__text {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: -1.5px;
      background: linear-gradient(135deg, var(--cyan-glow) 0%, var(--purple-glow) 50%, var(--pink-glow) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      background-size: 200% 200%;
      animation: gradientShift 6s ease-in-out infinite;
    }

    @keyframes gradientShift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }

    .cosmos-header__sub {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 400;
      letter-spacing: 4px;
      text-transform: uppercase;
    }

    /* ─── Connection Badge ───────────────────────────────── */
    .conn-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 18px;
      padding: 7px 18px;
      border-radius: 100px;
      background: rgba(0, 240, 255, 0.05);
      border: 1px solid rgba(0, 240, 255, 0.12);
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--cyan-dim);
      animation: fadeIn 1s ease-out 0.3s both;
      transition: all 0.3s ease;
    }

    .conn-badge:hover {
      background: rgba(0, 240, 255, 0.08);
      border-color: rgba(0, 240, 255, 0.25);
    }

    .conn-badge__dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 10px #22c55e;
      animation: blink 2s ease-in-out infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    /* ─── Stats Dashboard ────────────────────────────────── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 34px;
      animation: fadeInUp 0.7s var(--ease-spring) 0.2s both;
    }

    .stat-card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      padding: 20px 14px;
      text-align: center;
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      transition: all 0.4s var(--ease-spring);
      position: relative;
      overflow: hidden;
      cursor: default;
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--cyan-glow), transparent);
      opacity: 0;
      transition: opacity 0.4s ease;
    }

    .stat-card::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 0%, rgba(0, 240, 255, 0.06), transparent 70%);
      opacity: 0;
      transition: opacity 0.4s ease;
    }

    .stat-card:hover::before,
    .stat-card:hover::after {
      opacity: 1;
    }

    .stat-card:hover {
      border-color: var(--glass-border-hover);
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0, 240, 255, 0.08);
    }

    .stat-card__icon {
      font-size: 20px;
      margin-bottom: 8px;
      display: block;
    }

    .stat-card__number {
      font-size: 30px;
      font-weight: 800;
      background: linear-gradient(135deg, var(--cyan-glow), var(--purple-glow));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
      margin-bottom: 6px;
      position: relative;
      z-index: 1;
    }

    .stat-card__label {
      font-size: 10px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 600;
      position: relative;
      z-index: 1;
    }

    /* ─── Search Bar ─────────────────────────────────────── */
    .search-bar {
      position: relative;
      margin-bottom: 28px;
      animation: fadeInUp 0.7s var(--ease-spring) 0.3s both;
    }

    .search-bar__icon {
      position: absolute;
      left: 18px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 16px;
      color: var(--text-muted);
      pointer-events: none;
      transition: color 0.3s ease;
    }

    .search-bar__input {
      width: 100%;
      padding: 14px 50px 14px 48px;
      border-radius: 100px;
      border: 1px solid var(--glass-border);
      background: var(--glass-bg);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      color: var(--text-primary);
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 400;
      outline: none;
      transition: all 0.4s var(--ease-spring);
    }

    .search-bar__input:focus {
      border-color: rgba(0, 240, 255, 0.3);
      background: rgba(0, 240, 255, 0.04);
      box-shadow: 0 0 0 4px rgba(0, 240, 255, 0.06), 0 0 30px rgba(0, 240, 255, 0.05);
    }

    .search-bar__input:focus ~ .search-bar__icon {
      color: var(--cyan-glow);
    }

    .search-bar__input::placeholder {
      color: var(--text-muted);
    }

    .search-bar__kbd {
      position: absolute;
      right: 18px;
      top: 50%;
      transform: translateY(-50%);
      padding: 3px 10px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--text-muted);
      pointer-events: none;
      transition: opacity 0.3s ease;
    }

    .search-bar__input:focus ~ .search-bar__kbd {
      opacity: 0;
    }

    .search-bar__clear {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-secondary);
      font-size: 14px;
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .search-bar__clear:hover {
      background: rgba(255, 255, 255, 0.12);
      color: var(--text-primary);
    }

    .search-bar--active .search-bar__clear {
      display: flex;
    }

    .search-bar--active .search-bar__kbd {
      display: none;
    }

    /* ─── Glass Panel (form container) ───────────────────── */
    .glass-panel {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      padding: 30px;
      margin-bottom: 38px;
      position: relative;
      overflow: hidden;
      animation: fadeInUp 0.7s var(--ease-spring) 0.35s both;
      transition: all 0.4s var(--ease-spring);
    }

    .glass-panel::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.25), rgba(168, 85, 247, 0.2), transparent);
    }

    .glass-panel:focus-within {
      border-color: var(--glass-border-hover);
      box-shadow: 0 8px 40px rgba(0, 240, 255, 0.04);
    }

    .panel-title {
      font-size: 17px;
      font-weight: 700;
      margin-bottom: 22px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--text-primary);
    }

    .panel-title__icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, rgba(0, 240, 255, 0.12), rgba(168, 85, 247, 0.12));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      transition: transform 0.3s var(--ease-spring);
    }

    .glass-panel:focus-within .panel-title__icon {
      transform: scale(1.1) rotate(-5deg);
    }

    /* ─── Form Elements ──────────────────────────────────── */
    .form-row {
      display: flex;
      gap: 14px;
      margin-bottom: 16px;
    }

    .form-row > .form-group {
      margin-bottom: 0;
    }

    .form-row > .form-group:first-child {
      flex: 1;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 7px;
      text-transform: uppercase;
      letter-spacing: 1.2px;
    }

    .form-input,
    .form-textarea,
    .form-select {
      width: 100%;
      padding: 13px 16px;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-primary);
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      transition: all 0.35s var(--ease-spring);
      outline: none;
    }

    .form-select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a5078' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      padding-right: 38px;
    }

    .form-input:focus,
    .form-textarea:focus,
    .form-select:focus {
      border-color: var(--cyan-glow);
      background: rgba(0, 240, 255, 0.04);
      box-shadow: 0 0 0 3px rgba(0, 240, 255, 0.06), 0 0 24px rgba(0, 240, 255, 0.05);
    }

    .form-input::placeholder,
    .form-textarea::placeholder {
      color: var(--text-muted);
    }

    .form-textarea {
      resize: vertical;
      min-height: 80px;
      line-height: 1.6;
    }

    /* ─── Category dot ───────────────────────────────────── */
    .cat-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
      box-shadow: 0 0 8px currentColor;
    }

    /* ─── Submit Button ──────────────────────────────────── */
    .form-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .btn-submit {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 13px 30px;
      border: none;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, var(--cyan-glow), var(--purple-glow));
      color: var(--void);
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.4s var(--ease-spring);
      position: relative;
      overflow: hidden;
      letter-spacing: 0.3px;
    }

    .btn-submit::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
      transition: left 0.6s ease;
    }

    .btn-submit:hover {
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 8px 30px rgba(0, 240, 255, 0.35), 0 0 60px rgba(0, 240, 255, 0.1);
    }

    .btn-submit:hover::before {
      left: 100%;
    }

    .btn-submit:active {
      transform: translateY(-1px) scale(0.99);
    }

    /* ─── Notes Section Header ───────────────────────────── */
    .notes-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 22px;
      animation: fadeInUp 0.7s var(--ease-spring) 0.5s both;
    }

    .notes-header__title {
      font-size: 20px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .notes-header__count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 30px;
      height: 30px;
      padding: 0 10px;
      border-radius: 100px;
      background: linear-gradient(135deg, rgba(0, 240, 255, 0.12), rgba(168, 85, 247, 0.12));
      font-size: 12px;
      font-weight: 700;
      color: var(--cyan-glow);
      border: 1px solid rgba(0, 240, 255, 0.1);
    }

    .notes-header__filter-info {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
    }

    /* ─── Note Cards ─────────────────────────────────────── */
    .notes-grid {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .note-card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      padding: 24px 26px;
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      position: relative;
      overflow: hidden;
      transition: all 0.45s var(--ease-spring);
      animation: noteSlideIn 0.6s var(--ease-spring) both;
    }

    .note-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 3px;
      height: 100%;
      opacity: 0;
      transition: opacity 0.35s ease;
    }

    .note-card:hover {
      border-color: var(--glass-border-hover);
      transform: translateX(5px);
      box-shadow: 0 6px 30px rgba(0, 240, 255, 0.06), -4px 0 24px rgba(0, 240, 255, 0.03);
    }

    .note-card:hover::before {
      opacity: 1;
    }

    .note-card--pinned {
      border-color: rgba(168, 85, 247, 0.2);
    }

    .note-card--pinned::after {
      content: '';
      position: absolute;
      top: -1px;
      right: 24px;
      width: 26px;
      height: 28px;
      background: linear-gradient(135deg, var(--purple-glow), var(--pink-glow));
      clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%);
      box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
    }

    .note-card.is-hidden {
      display: none;
    }

    @keyframes noteSlideIn {
      from {
        opacity: 0;
        transform: translateY(24px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .note-card__top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 10px;
    }

    .note-card__title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }

    .note-card__title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.4;
    }

    .note-card__title-input {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      background: rgba(0, 240, 255, 0.04);
      border: 1px solid rgba(0, 240, 255, 0.2);
      border-radius: var(--radius-sm);
      padding: 6px 12px;
      width: 100%;
      font-family: 'Outfit', sans-serif;
      outline: none;
      transition: all 0.3s ease;
    }

    .note-card__title-input:focus {
      border-color: var(--cyan-glow);
      box-shadow: 0 0 0 3px rgba(0, 240, 255, 0.06);
    }

    .note-card__actions {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .note-card:hover .note-card__actions {
      opacity: 1;
    }

    .btn-icon {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: all 0.3s var(--ease-spring);
    }

    .btn-icon:hover {
      transform: scale(1.12);
    }

    .btn-icon--pin {
      border-color: rgba(168, 85, 247, 0.15);
    }

    .btn-icon--pin:hover {
      background: rgba(168, 85, 247, 0.1);
      border-color: rgba(168, 85, 247, 0.35);
      color: var(--purple-glow);
      box-shadow: 0 0 12px rgba(168, 85, 247, 0.15);
    }

    .btn-icon--pin.is-pinned {
      background: rgba(168, 85, 247, 0.12);
      border-color: rgba(168, 85, 247, 0.3);
      color: var(--purple-glow);
    }

    .btn-icon--edit {
      border-color: rgba(0, 240, 255, 0.12);
    }

    .btn-icon--edit:hover {
      background: rgba(0, 240, 255, 0.08);
      border-color: rgba(0, 240, 255, 0.3);
      color: var(--cyan-glow);
      box-shadow: 0 0 12px rgba(0, 240, 255, 0.12);
    }

    .btn-icon--delete {
      border-color: rgba(244, 63, 94, 0.12);
    }

    .btn-icon--delete:hover {
      background: rgba(244, 63, 94, 0.1);
      border-color: rgba(244, 63, 94, 0.35);
      color: #f43f5e;
      box-shadow: 0 0 12px rgba(244, 63, 94, 0.12);
    }

    .note-card__body {
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.7;
      margin-bottom: 14px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .note-card__body-edit {
      width: 100%;
      padding: 10px 14px;
      min-height: 60px;
      border: 1px solid rgba(0, 240, 255, 0.2);
      border-radius: var(--radius-sm);
      background: rgba(0, 240, 255, 0.04);
      color: var(--text-primary);
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      line-height: 1.7;
      resize: vertical;
      outline: none;
      transition: all 0.3s ease;
      margin-bottom: 14px;
    }

    .note-card__body-edit:focus {
      border-color: var(--cyan-glow);
      box-shadow: 0 0 0 3px rgba(0, 240, 255, 0.06);
    }

    .note-card__edit-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 14px;
    }

    .btn-save-edit {
      padding: 7px 18px;
      border: none;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, var(--cyan-glow), var(--purple-glow));
      color: var(--void);
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s var(--ease-spring);
    }

    .btn-save-edit:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(0, 240, 255, 0.3);
    }

    .btn-cancel-edit {
      padding: 7px 18px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-cancel-edit:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .note-card__empty {
      font-style: italic;
      color: var(--text-muted);
    }

    .note-card__footer {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--text-muted);
    }

    .note-card__footer-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--purple-glow);
      opacity: 0.4;
    }

    .note-card__id {
      color: var(--purple-dim);
    }

    .note-card__cat-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 10px;
      border-radius: 100px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    /* ─── Empty State ────────────────────────────────────── */
    .empty-state {
      text-align: center;
      padding: 70px 20px;
      animation: fadeInUp 0.7s var(--ease-spring) 0.5s both;
    }

    .empty-state__icon {
      font-size: 64px;
      margin-bottom: 20px;
      animation: float 5s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      25% { transform: translateY(-8px) rotate(-2deg); }
      75% { transform: translateY(-14px) rotate(2deg); }
    }

    .empty-state__title {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 10px;
    }

    .empty-state__text {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.6;
    }

    .empty-state__hint {
      margin-top: 20px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      border-radius: 100px;
      background: rgba(0, 240, 255, 0.05);
      border: 1px solid rgba(0, 240, 255, 0.1);
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--text-muted);
    }

    /* ─── No Results ──────────────────────────────────────── */
    .no-results {
      text-align: center;
      padding: 40px 20px;
      display: none;
    }

    .no-results.is-visible {
      display: block;
    }

    .no-results__icon {
      font-size: 40px;
      margin-bottom: 12px;
      opacity: 0.6;
    }

    .no-results__text {
      font-size: 14px;
      color: var(--text-muted);
    }

    /* ─── Toast / Notification ───────────────────────────── */
    .toast-container {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 1000;
      display: flex;
      flex-direction: column-reverse;
      gap: 10px;
    }

    .toast {
      padding: 14px 24px 14px 18px;
      border-radius: var(--radius-md);
      background: rgba(12, 12, 36, 0.9);
      border: 1px solid var(--glass-border);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      color: var(--text-primary);
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 10px;
      transform: translateX(120%);
      opacity: 0;
      transition: all 0.5s var(--ease-spring);
      position: relative;
      overflow: hidden;
      min-width: 260px;
    }

    .toast--visible {
      transform: translateX(0);
      opacity: 1;
    }

    .toast--success {
      border-color: rgba(34, 197, 94, 0.3);
      box-shadow: 0 0 24px rgba(34, 197, 94, 0.08);
    }

    .toast--error {
      border-color: rgba(244, 63, 94, 0.3);
      box-shadow: 0 0 24px rgba(244, 63, 94, 0.08);
    }

    .toast--info {
      border-color: rgba(0, 240, 255, 0.3);
      box-shadow: 0 0 24px rgba(0, 240, 255, 0.08);
    }

    .toast__progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      border-radius: 0 0 var(--radius-md) var(--radius-md);
      animation: toastProgress 3s linear forwards;
    }

    .toast--success .toast__progress {
      background: linear-gradient(90deg, #22c55e, #34d399);
    }

    .toast--error .toast__progress {
      background: linear-gradient(90deg, #f43f5e, #fb7185);
    }

    .toast--info .toast__progress {
      background: linear-gradient(90deg, var(--cyan-glow), var(--purple-glow));
    }

    @keyframes toastProgress {
      from { width: 100%; }
      to { width: 0%; }
    }

    /* ─── Delete Confirm Modal ───────────────────────────── */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(5, 5, 16, 0.8);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      z-index: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.35s ease;
    }

    .modal-overlay--active {
      opacity: 1;
      pointer-events: all;
    }

    .modal {
      background: var(--nebula-dark);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      padding: 36px;
      max-width: 420px;
      width: 92%;
      text-align: center;
      transform: scale(0.85) translateY(30px);
      transition: transform 0.45s var(--ease-spring);
      position: relative;
      overflow: hidden;
    }

    .modal::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(244, 63, 94, 0.3), transparent);
    }

    .modal-overlay--active .modal {
      transform: scale(1) translateY(0);
    }

    .modal__icon {
      font-size: 44px;
      margin-bottom: 18px;
    }

    .modal__title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 10px;
    }

    .modal__text {
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 28px;
      line-height: 1.6;
    }

    .modal__actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .btn-modal {
      padding: 11px 26px;
      border-radius: var(--radius-sm);
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.35s var(--ease-spring);
      border: none;
    }

    .btn-modal--cancel {
      background: rgba(255,255,255,0.05);
      color: var(--text-secondary);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .btn-modal--cancel:hover {
      background: rgba(255,255,255,0.1);
      transform: translateY(-1px);
    }

    .btn-modal--danger {
      background: linear-gradient(135deg, #f43f5e, #e11d48);
      color: white;
    }

    .btn-modal--danger:hover {
      box-shadow: 0 6px 24px rgba(244, 63, 94, 0.4);
      transform: translateY(-2px);
    }

    /* ─── Scrollbar ──────────────────────────────────────── */
    ::-webkit-scrollbar {
      width: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(0, 240, 255, 0.12);
      border-radius: 100px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 240, 255, 0.22);
    }

    /* ─── Footer ─────────────────────────────────────────── */
    .cosmos-footer {
      text-align: center;
      padding: 48px 0 0;
      font-size: 12px;
      color: var(--text-muted);
      animation: fadeIn 1s ease-out 0.8s both;
    }

    .cosmos-footer a {
      color: var(--cyan-dim);
      text-decoration: none;
      transition: color 0.3s ease;
    }

    .cosmos-footer a:hover {
      color: var(--cyan-glow);
    }

    .cosmos-footer__shortcuts {
      margin-top: 12px;
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .cosmos-footer__shortcut {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--text-muted);
    }

    .cosmos-footer__shortcut kbd {
      padding: 2px 7px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 10px;
    }

    /* ─── Animations ─────────────────────────────────────── */
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes fadeInDown {
      from { opacity: 0; transform: translateY(-24px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.9); }
      to   { opacity: 1; transform: scale(1); }
    }

    /* ─── Success flash on card ──────────────────────────── */
    .note-card.is-new {
      animation: cardFlash 1.2s ease-out;
    }

    @keyframes cardFlash {
      0%   { box-shadow: 0 0 0 0 rgba(0, 240, 255, 0.4); }
      30%  { box-shadow: 0 0 40px 4px rgba(0, 240, 255, 0.2); }
      100% { box-shadow: none; }
    }

    /* ─── Responsive ─────────────────────────────────────── */
    @media (max-width: 700px) {
      .cosmos-app {
        padding: 20px 16px 70px;
      }
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      .stat-card {
        padding: 16px 10px;
      }
      .stat-card__number {
        font-size: 24px;
      }
      .glass-panel {
        padding: 22px 18px;
      }
      .cosmos-logo__text {
        font-size: 26px;
      }
      .note-card__actions {
        opacity: 1;
      }
      .form-row {
        flex-direction: column;
        gap: 0;
      }
      .form-row > .form-group {
        margin-bottom: 16px;
      }
      .cosmos-footer__shortcuts {
        display: none;
      }
    }

    /* ─── Form submission animation ──────────────────────── */
    .btn-submit.is-loading {
      pointer-events: none;
      opacity: 0.75;
    }

    .btn-submit.is-loading::after {
      content: '';
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ─── Keyboard focus ring ────────────────────────────── */
    :focus-visible {
      outline: 2px solid rgba(0, 240, 255, 0.4);
      outline-offset: 2px;
    }

    /* ─── Pinned Section Divider ─────────────────────────── */
    .section-divider {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 20px 0 16px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .section-divider::before,
    .section-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.1), transparent);
    }

    .section-divider__icon {
      font-size: 14px;
    }
  </style>
</head>
<body>

  <!-- Starfield -->
  <canvas id="starfield"></canvas>

  <!-- Grid overlay -->
  <div class="grid-overlay"></div>

  <!-- Nebula ambient orbs (parallax-reactive) -->
  <div class="nebula-orb nebula-orb--cyan" id="nebulaCyan"></div>
  <div class="nebula-orb nebula-orb--purple" id="nebulaPurple"></div>
  <div class="nebula-orb nebula-orb--pink" id="nebulaPink"></div>
  <div class="nebula-orb nebula-orb--green" id="nebulaGreen"></div>

  <!-- Main App -->
  <div class="cosmos-app">

    <!-- Header -->
    <header class="cosmos-header">
      <div class="cosmos-logo">
        <div class="cosmos-logo__icon">✦</div>
        <h1 class="cosmos-logo__text">Cosmos Notes</h1>
      </div>
      <p class="cosmos-header__sub">Mission Control for Your Thoughts</p>
      <div class="conn-badge">
        <span class="conn-badge__dot"></span>
        ${esc(dbConfig.host)} · ${esc(dbConfig.database)} · ${esc(dbConfig.user)}
      </div>
    </header>

    <!-- Stats Dashboard -->
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-card__icon">📝</span>
        <div class="stat-card__number" data-count="${noteCount}">0</div>
        <div class="stat-card__label">Total Notes</div>
      </div>
      <div class="stat-card">
        <span class="stat-card__icon">📌</span>
        <div class="stat-card__number" data-count="${pinnedCount}">0</div>
        <div class="stat-card__label">Pinned</div>
      </div>
      <div class="stat-card">
        <span class="stat-card__icon">🕐</span>
        <div class="stat-card__number" data-count="${todayCount}">0</div>
        <div class="stat-card__label">Today</div>
      </div>
      <div class="stat-card">
        <span class="stat-card__icon">💬</span>
        <div class="stat-card__number" data-count="${totalWords}">0</div>
        <div class="stat-card__label">Words</div>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="search-bar" id="searchBar">
      <span class="search-bar__icon">🔍</span>
      <input class="search-bar__input" type="text" id="searchInput" placeholder="Search your cosmos..." autocomplete="off">
      <span class="search-bar__kbd">/</span>
      <button class="search-bar__clear" id="searchClear" type="button" aria-label="Clear search">✕</button>
    </div>

    <!-- New Note Form -->
    <div class="glass-panel">
      <div class="panel-title">
        <div class="panel-title__icon">✍️</div>
        Launch a New Note
      </div>
      <form method="POST" action="/notas" id="noteForm">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="titulo">Title</label>
            <input class="form-input" type="text" id="titulo" name="titulo" placeholder="What's on your mind?" required autocomplete="off">
          </div>
          <div class="form-group" style="width: 160px; flex-shrink: 0;">
            <label class="form-label" for="category">Category</label>
            <select class="form-select" id="category" name="category">
              ${Object.entries(CATEGORIES).map(([key, cat]) => `<option value="${key}" ${key === 'nebula' ? 'selected' : ''}>${cat.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="contenido">Content</label>
          <textarea class="form-textarea" id="contenido" name="contenido" rows="3" placeholder="Capture your thoughts into the cosmos..."></textarea>
        </div>
        <div class="form-actions">
          <button class="btn-submit" type="submit" id="submitBtn">
            <span>🚀</span>
            <span>Launch Note</span>
          </button>
          <span class="cosmos-footer__shortcut" style="font-size:11px;color:var(--text-muted)">
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to submit · <kbd>N</kbd> new note
          </span>
        </div>
      </form>
    </div>

    <!-- Notes List -->
    <div class="notes-header">
      <h2 class="notes-header__title">
        Stellar Log
        <span class="notes-header__count" id="visibleCount">${noteCount}</span>
      </h2>
      <span class="notes-header__filter-info" id="filterInfo"></span>
    </div>

    ${noteCount > 0 ? `
    ${pinnedCount > 0 ? `<div class="section-divider"><span class="section-divider__icon">📌</span> Pinned</div>` : ''}

    <div class="notes-grid" id="notesGrid">
      ${sortedRows.map((nota, i) => {
        const cat = CATEGORIES[nota.category] || CATEGORIES.nebula;
        const isPinned = nota.pinned;
        if (isPinned && i === pinnedCount) {
          // Insert divider between pinned and unpinned
          return `</div><div class="section-divider"><span class="section-divider__icon">📋</span> All Notes</div><div class="notes-grid" id="notesGridAll">
          <div class="note-card ${isPinned ? 'note-card--pinned' : ''}" style="animation-delay: ${0.55 + (i * 0.06)}s; --cat-color: ${cat.color}" data-id="${nota.id}" data-title="${esc(nota.titulo)}" data-content="${esc(nota.contenido || '')}">
            <div class="note-card__top">
              <div class="note-card__title-row">
                <span class="cat-dot" style="background: ${cat.gradient}; color: ${cat.color}"></span>
                <div class="note-card__title" id="title-${nota.id}">${esc(nota.titulo)}</div>
              </div>
              <div class="note-card__actions">
                <button class="btn-icon btn-icon--pin ${isPinned ? 'is-pinned' : ''}" onclick="togglePin(${nota.id})" title="${isPinned ? 'Unpin' : 'Pin'} note" aria-label="Pin note">📌</button>
                <button class="btn-icon btn-icon--edit" onclick="startEdit(${nota.id})" title="Edit note" aria-label="Edit note">✏️</button>
                <button class="btn-icon btn-icon--delete" onclick="confirmDelete(${nota.id}, '${esc(nota.titulo).replace(/'/g, "\\'")}')" title="Delete note" aria-label="Delete note">🗑️</button>
              </div>
            </div>
            <div class="note-card__body" id="body-${nota.id}">
              ${nota.contenido ? esc(nota.contenido) : '<span class="note-card__empty">No content</span>'}
            </div>
            <div class="note-card__footer">
              <span class="note-card__id">#${nota.id}</span>
              <span class="note-card__footer-dot"></span>
              <span class="note-card__cat-badge" style="color: ${cat.color}; border-color: ${cat.color}22">
                <span class="cat-dot" style="width:6px;height:6px;background:${cat.color};box-shadow:0 0 6px ${cat.color}"></span>
                ${cat.label}
              </span>
              <span class="note-card__footer-dot"></span>
              <span>${timeAgo(nota.creado_en)}</span>
              <span class="note-card__footer-dot"></span>
              <span>${new Date(nota.creado_en).toLocaleString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>`;
        }
        return `
        <div class="note-card ${isPinned ? 'note-card--pinned' : ''}" style="animation-delay: ${0.55 + (i * 0.06)}s; --cat-color: ${cat.color}" data-id="${nota.id}" data-title="${esc(nota.titulo)}" data-content="${esc(nota.contenido || '')}">
          <div style="position:absolute;top:0;left:0;width:3px;height:100%;background:${cat.gradient};opacity:0;transition:opacity 0.3s ease" class="note-card__accent"></div>
          <div class="note-card__top">
            <div class="note-card__title-row">
              <span class="cat-dot" style="background: ${cat.gradient}; color: ${cat.color}"></span>
              <div class="note-card__title" id="title-${nota.id}">${esc(nota.titulo)}</div>
            </div>
            <div class="note-card__actions">
              <button class="btn-icon btn-icon--pin ${isPinned ? 'is-pinned' : ''}" onclick="togglePin(${nota.id})" title="${isPinned ? 'Unpin' : 'Pin'} note" aria-label="Pin note">📌</button>
              <button class="btn-icon btn-icon--edit" onclick="startEdit(${nota.id})" title="Edit note" aria-label="Edit note">✏️</button>
              <button class="btn-icon btn-icon--delete" onclick="confirmDelete(${nota.id}, '${esc(nota.titulo).replace(/'/g, "\\'")}')" title="Delete note" aria-label="Delete note">🗑️</button>
            </div>
          </div>
          <div class="note-card__body" id="body-${nota.id}">
            ${nota.contenido ? esc(nota.contenido) : '<span class="note-card__empty">No content</span>'}
          </div>
          <div class="note-card__footer">
            <span class="note-card__id">#${nota.id}</span>
            <span class="note-card__footer-dot"></span>
            <span class="note-card__cat-badge" style="color: ${cat.color}; border-color: ${cat.color}22">
              <span class="cat-dot" style="width:6px;height:6px;background:${cat.color};box-shadow:0 0 6px ${cat.color}"></span>
              ${cat.label}
            </span>
            <span class="note-card__footer-dot"></span>
            <span>${timeAgo(nota.creado_en)}</span>
            <span class="note-card__footer-dot"></span>
            <span>${new Date(nota.creado_en).toLocaleString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- No search results -->
    <div class="no-results" id="noResults">
      <div class="no-results__icon">🔭</div>
      <div class="no-results__text">No notes found in this dimension</div>
    </div>

    ` : `
    <div class="empty-state">
      <div class="empty-state__icon">🪐</div>
      <div class="empty-state__title">The cosmos is quiet</div>
      <div class="empty-state__text">Launch your first note to light up the stars</div>
      <div class="empty-state__hint">
        Press <kbd style="padding:2px 7px;border-radius:4px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08)">N</kbd> to start writing
      </div>
    </div>
    `}

    <footer class="cosmos-footer">
      Cosmos Notes ✦ Powered by Express + MySQL · ${new Date().getFullYear()}
      <div class="cosmos-footer__shortcuts">
        <span class="cosmos-footer__shortcut"><kbd>/</kbd> Search</span>
        <span class="cosmos-footer__shortcut"><kbd>N</kbd> New note</span>
        <span class="cosmos-footer__shortcut"><kbd>Ctrl+Enter</kbd> Submit</span>
        <span class="cosmos-footer__shortcut"><kbd>Esc</kbd> Close</span>
      </div>
    </footer>
  </div>

  <!-- Delete Confirm Modal -->
  <div class="modal-overlay" id="deleteModal">
    <div class="modal">
      <div class="modal__icon">⚠️</div>
      <div class="modal__title">Destroy this note?</div>
      <div class="modal__text" id="deleteModalText">This action is permanent and cannot be undone.</div>
      <div class="modal__actions">
        <button class="btn-modal btn-modal--cancel" onclick="closeModal()">Abort</button>
        <button class="btn-modal btn-modal--danger" id="confirmDeleteBtn">Destroy</button>
      </div>
    </div>
  </div>

  <!-- Toast Container -->
  <div class="toast-container" id="toastContainer"></div>

  <script>
    // ═══════════════════════════════════════════════════════════
    // STARFIELD — enhanced animated canvas background
    // ═══════════════════════════════════════════════════════════
    (function() {
      const canvas = document.getElementById('starfield');
      const ctx = canvas.getContext('2d');
      let stars = [];
      let shootingStars = [];
      const STAR_COUNT = 280;
      let w, h;

      function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
      }

      function createStars() {
        stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            radius: Math.random() * 1.6 + 0.2,
            alpha: Math.random() * 0.8 + 0.2,
            speed: Math.random() * 0.001 + 0.0002,
            phase: Math.random() * Math.PI * 2,
            hue: Math.random() > 0.85 ? (Math.random() > 0.5 ? 180 : 270) : 220,
          });
        }
      }

      function spawnShootingStar() {
        if (Math.random() < 0.0025 && shootingStars.length < 2) {
          const startX = Math.random() * w * 0.7;
          const startY = Math.random() * h * 0.4;
          shootingStars.push({
            x: startX,
            y: startY,
            len: Math.random() * 80 + 50,
            speed: Math.random() * 7 + 5,
            alpha: 1,
            hue: Math.random() > 0.5 ? 180 : 270,
          });
        }
      }

      function draw() {
        ctx.clearRect(0, 0, w, h);
        const time = Date.now();

        // Stars with twinkle & subtle color
        for (const star of stars) {
          const twinkle = Math.sin(time * star.speed + star.phase) * 0.4 + 0.6;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
          ctx.fillStyle = \`hsla(\${star.hue}, 60%, 85%, \${star.alpha * twinkle})\`;
          ctx.fill();
        }

        // Shooting stars
        spawnShootingStar();
        for (let i = shootingStars.length - 1; i >= 0; i--) {
          const ss = shootingStars[i];
          const gradient = ctx.createLinearGradient(
            ss.x, ss.y, ss.x - ss.len, ss.y - ss.len * 0.3
          );
          gradient.addColorStop(0, \`hsla(\${ss.hue}, 100%, 70%, \${ss.alpha})\`);
          gradient.addColorStop(0.4, \`hsla(\${ss.hue}, 100%, 70%, \${ss.alpha * 0.4})\`);
          gradient.addColorStop(1, \`hsla(\${ss.hue}, 100%, 70%, 0)\`);

          ctx.beginPath();
          ctx.moveTo(ss.x, ss.y);
          ctx.lineTo(ss.x - ss.len, ss.y - ss.len * 0.3);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1.8;
          ctx.stroke();

          // Glow dot at head
          ctx.beginPath();
          ctx.arc(ss.x, ss.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = \`hsla(\${ss.hue}, 100%, 90%, \${ss.alpha})\`;
          ctx.fill();

          ss.x += ss.speed;
          ss.y += ss.speed * 0.3;
          ss.alpha -= 0.01;

          if (ss.alpha <= 0 || ss.x > w + 100) {
            shootingStars.splice(i, 1);
          }
        }

        requestAnimationFrame(draw);
      }

      window.addEventListener('resize', () => {
        resize();
        createStars();
      });

      resize();
      createStars();
      draw();
    })();

    // ═══════════════════════════════════════════════════════════
    // PARALLAX — Nebula orbs follow mouse
    // ═══════════════════════════════════════════════════════════
    (function() {
      const orbs = [
        { el: document.getElementById('nebulaCyan'),   factor: 0.02 },
        { el: document.getElementById('nebulaPurple'), factor: -0.015 },
        { el: document.getElementById('nebulaPink'),   factor: 0.025 },
        { el: document.getElementById('nebulaGreen'),  factor: -0.02 },
      ];

      let targetX = 0, targetY = 0;
      let currentX = 0, currentY = 0;

      document.addEventListener('mousemove', (e) => {
        targetX = (e.clientX - window.innerWidth / 2);
        targetY = (e.clientY - window.innerHeight / 2);
      });

      function animate() {
        currentX += (targetX - currentX) * 0.04;
        currentY += (targetY - currentY) * 0.04;

        for (const orb of orbs) {
          if (orb.el) {
            orb.el.style.transform = \`translate(\${currentX * orb.factor}px, \${currentY * orb.factor}px)\`;
          }
        }
        requestAnimationFrame(animate);
      }
      animate();
    })();

    // ═══════════════════════════════════════════════════════════
    // ANIMATED COUNTERS — count-up on load
    // ═══════════════════════════════════════════════════════════
    (function() {
      const counters = document.querySelectorAll('.stat-card__number[data-count]');
      const duration = 1200;

      function easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.dataset.count, 10);
            if (target === 0) { el.textContent = '0'; return; }
            const start = performance.now();

            function update(now) {
              const elapsed = now - start;
              const progress = Math.min(elapsed / duration, 1);
              const value = Math.round(easeOutExpo(progress) * target);
              el.textContent = value.toLocaleString();
              if (progress < 1) requestAnimationFrame(update);
            }

            requestAnimationFrame(update);
            observer.unobserve(el);
          }
        });
      }, { threshold: 0.3 });

      counters.forEach(c => observer.observe(c));
    })();

    // ═══════════════════════════════════════════════════════════
    // SEARCH — live filter notes
    // ═══════════════════════════════════════════════════════════
    (function() {
      const searchInput = document.getElementById('searchInput');
      const searchBar = document.getElementById('searchBar');
      const searchClear = document.getElementById('searchClear');
      const noResults = document.getElementById('noResults');
      const visibleCount = document.getElementById('visibleCount');
      const filterInfo = document.getElementById('filterInfo');

      if (!searchInput) return;

      searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        const cards = document.querySelectorAll('.note-card');
        let visible = 0;

        searchBar.classList.toggle('search-bar--active', query.length > 0);

        cards.forEach(card => {
          const title = (card.dataset.title || '').toLowerCase();
          const content = (card.dataset.content || '').toLowerCase();
          const match = !query || title.includes(query) || content.includes(query);
          card.classList.toggle('is-hidden', !match);
          if (match) visible++;
        });

        if (visibleCount) visibleCount.textContent = visible;
        if (noResults) noResults.classList.toggle('is-visible', visible === 0 && cards.length > 0);
        if (filterInfo) {
          filterInfo.textContent = query ? \`Showing \${visible} of \${cards.length}\` : '';
        }
      });

      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
        searchInput.focus();
      });
    })();

    // ═══════════════════════════════════════════════════════════
    // FORM — AJAX submission (no page reload)
    // ═══════════════════════════════════════════════════════════
    const noteForm = document.getElementById('noteForm');
    const submitBtn = document.getElementById('submitBtn');

    noteForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const titulo = document.getElementById('titulo').value.trim();
      if (!titulo) return;

      submitBtn.classList.add('is-loading');
      submitBtn.querySelector('span:last-child').textContent = 'Launching...';

      try {
        const formData = new URLSearchParams(new FormData(noteForm));
        const res = await fetch('/notas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString(),
        });

        if (res.ok) {
          showToast('Note launched into the cosmos! ✨', 'success');
          setTimeout(() => location.reload(), 500);
        } else {
          showToast('Failed to launch note', 'error');
        }
      } catch (err) {
        showToast('Network error — check your connection', 'error');
      } finally {
        submitBtn.classList.remove('is-loading');
        submitBtn.querySelector('span:last-child').textContent = 'Launch Note';
      }
    });

    // ═══════════════════════════════════════════════════════════
    // KEYBOARD SHORTCUTS
    // ═══════════════════════════════════════════════════════════
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in inputs
      const tag = document.activeElement.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Ctrl/Cmd + Enter — submit form
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const titulo = document.getElementById('titulo');
        if (titulo.value.trim()) {
          noteForm.dispatchEvent(new Event('submit', { cancelable: true }));
        }
        return;
      }

      // Escape — close modal or clear search
      if (e.key === 'Escape') {
        closeModal();
        const searchInput = document.getElementById('searchInput');
        if (document.activeElement === searchInput) {
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input'));
          searchInput.blur();
        }
        return;
      }

      if (isInput) return;

      // "/" — focus search
      if (e.key === '/') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
        return;
      }

      // "N" — focus new note title
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        document.getElementById('titulo').focus();
        return;
      }
    });

    // ═══════════════════════════════════════════════════════════
    // PIN — toggle pin status
    // ═══════════════════════════════════════════════════════════
    async function togglePin(id) {
      try {
        const res = await fetch(\`/notas/\${id}/pin\`, { method: 'PATCH' });
        if (res.ok) {
          const data = await res.json();
          showToast(data.pinned ? 'Note pinned 📌' : 'Note unpinned', 'info');
          setTimeout(() => location.reload(), 400);
        } else {
          showToast('Failed to pin note', 'error');
        }
      } catch (err) {
        showToast('Network error', 'error');
      }
    }

    // ═══════════════════════════════════════════════════════════
    // EDIT — inline editing
    // ═══════════════════════════════════════════════════════════
    function startEdit(id) {
      const card = document.querySelector(\`[data-id="\${id}"]\`);
      if (!card || card.classList.contains('is-editing')) return;

      card.classList.add('is-editing');

      const titleEl = document.getElementById(\`title-\${id}\`);
      const bodyEl = document.getElementById(\`body-\${id}\`);

      const originalTitle = card.dataset.title;
      const originalContent = card.dataset.content;

      // Replace title with input
      const titleInput = document.createElement('input');
      titleInput.className = 'note-card__title-input';
      titleInput.value = originalTitle;
      titleInput.setAttribute('data-original', originalTitle);
      titleEl.replaceWith(titleInput);
      titleInput.id = \`title-\${id}\`;

      // Replace body with textarea
      const bodyTextarea = document.createElement('textarea');
      bodyTextarea.className = 'note-card__body-edit';
      bodyTextarea.value = originalContent;
      bodyTextarea.setAttribute('data-original', originalContent);
      bodyEl.replaceWith(bodyTextarea);
      bodyTextarea.id = \`body-\${id}\`;

      // Add save/cancel buttons
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'note-card__edit-actions';
      actionsDiv.innerHTML = \`
        <button class="btn-save-edit" onclick="saveEdit(\${id})">💾 Save</button>
        <button class="btn-cancel-edit" onclick="cancelEdit(\${id}, '\${originalTitle.replace(/'/g, "\\\\'")}', '\${originalContent.replace(/'/g, "\\\\'")}')">Cancel</button>
      \`;
      bodyTextarea.after(actionsDiv);

      titleInput.focus();

      // Ctrl+Enter to save within edit
      const editKeyHandler = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          saveEdit(id);
          document.removeEventListener('keydown', editKeyHandler);
        }
      };
      document.addEventListener('keydown', editKeyHandler);
    }

    async function saveEdit(id) {
      const card = document.querySelector(\`[data-id="\${id}"]\`);
      if (!card) return;

      const titleInput = document.getElementById(\`title-\${id}\`);
      const bodyTextarea = document.getElementById(\`body-\${id}\`);

      const newTitle = titleInput.value.trim();
      const newContent = bodyTextarea.value;

      if (!newTitle) {
        showToast('Title cannot be empty', 'error');
        titleInput.focus();
        return;
      }

      try {
        const res = await fetch(\`/notas/\${id}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titulo: newTitle, contenido: newContent }),
        });

        if (res.ok) {
          showToast('Note updated ✏️', 'success');
          setTimeout(() => location.reload(), 400);
        } else {
          showToast('Failed to update note', 'error');
        }
      } catch (err) {
        showToast('Network error', 'error');
      }
    }

    function cancelEdit(id, originalTitle, originalContent) {
      const card = document.querySelector(\`[data-id="\${id}"]\`);
      if (!card) return;

      card.classList.remove('is-editing');

      const titleInput = document.getElementById(\`title-\${id}\`);
      const bodyTextarea = document.getElementById(\`body-\${id}\`);

      // Restore title
      const titleDiv = document.createElement('div');
      titleDiv.className = 'note-card__title';
      titleDiv.id = \`title-\${id}\`;
      titleDiv.textContent = originalTitle;
      titleInput.replaceWith(titleDiv);

      // Restore body
      const bodyDiv = document.createElement('div');
      bodyDiv.className = 'note-card__body';
      bodyDiv.id = \`body-\${id}\`;
      bodyDiv.textContent = originalContent || '';
      if (!originalContent) {
        bodyDiv.innerHTML = '<span class="note-card__empty">No content</span>';
      }

      // Remove edit actions
      const editActions = card.querySelector('.note-card__edit-actions');
      if (editActions) editActions.remove();

      bodyTextarea.replaceWith(bodyDiv);
    }

    // ═══════════════════════════════════════════════════════════
    // DELETE — Modal & AJAX delete
    // ═══════════════════════════════════════════════════════════
    let deleteId = null;
    const deleteModal = document.getElementById('deleteModal');
    const deleteModalText = document.getElementById('deleteModalText');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    function confirmDelete(id, title) {
      deleteId = id;
      deleteModalText.textContent = \`"\${title}" will be lost forever in the void.\`;
      deleteModal.classList.add('modal-overlay--active');
    }

    function closeModal() {
      deleteModal.classList.remove('modal-overlay--active');
      deleteId = null;
    }

    // Close modal on overlay click
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) closeModal();
    });

    confirmDeleteBtn.addEventListener('click', async () => {
      if (!deleteId) return;
      confirmDeleteBtn.textContent = 'Destroying...';
      confirmDeleteBtn.disabled = true;

      try {
        const res = await fetch(\`/notas/\${deleteId}\`, { method: 'DELETE' });
        if (res.ok) {
          closeModal();
          // Animate card removal
          const card = document.querySelector(\`[data-id="\${deleteId}"]\`);
          if (card) {
            card.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
            card.style.transform = 'translateX(80px) scale(0.9)';
            card.style.opacity = '0';
            card.style.maxHeight = card.offsetHeight + 'px';
            setTimeout(() => {
              card.style.maxHeight = '0';
              card.style.padding = '0';
              card.style.margin = '0';
              card.style.border = 'none';
            }, 200);
            setTimeout(() => location.reload(), 600);
          } else {
            location.reload();
          }
          showToast('Note destroyed 💥', 'success');
        } else {
          showToast('Failed to delete note', 'error');
        }
      } catch (err) {
        showToast('Network error', 'error');
      } finally {
        confirmDeleteBtn.textContent = 'Destroy';
        confirmDeleteBtn.disabled = false;
      }
    });

    // ═══════════════════════════════════════════════════════════
    // TOAST — enhanced notification system with progress bar
    // ═══════════════════════════════════════════════════════════
    let toastCount = 0;
    function showToast(message, type = 'success') {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      const id = ++toastCount;
      toast.className = \`toast toast--\${type}\`;
      toast.innerHTML = \`
        \${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} \${message}
        <div class="toast__progress"></div>
      \`;

      container.appendChild(toast);

      // Trigger animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          toast.classList.add('toast--visible');
        });
      });

      setTimeout(() => {
        toast.classList.remove('toast--visible');
        setTimeout(() => toast.remove(), 500);
      }, 3200);
    }

    // ═══════════════════════════════════════════════════════════
    // HOVER ACCENT — show accent bar on hover
    // ═══════════════════════════════════════════════════════════
    document.querySelectorAll('.note-card__accent').forEach(accent => {
      const card = accent.closest('.note-card');
      card.addEventListener('mouseenter', () => accent.style.opacity = '1');
      card.addEventListener('mouseleave', () => accent.style.opacity = '0');
    });

    // ═══════════════════════════════════════════════════════════
    // Auto-focus title input
    // ═══════════════════════════════════════════════════════════
    // Don't auto-focus on mobile to avoid keyboard popup
    if (window.innerWidth > 768) {
      document.getElementById('titulo').focus();
    }
  </script>
</body>
</html>`;
}

// Página principal: formulario + listado de notas
app.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM notas ORDER BY creado_en DESC');
    res.send(renderPage(rows));
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

// Crear nota
app.post('/notas', async (req, res) => {
  try {
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
app.put('/notas/:id', async (req, res) => {
  try {
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
app.patch('/notas/:id/pin', async (req, res) => {
  try {
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
app.delete('/notas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM notas WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

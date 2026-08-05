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

// ─── Render the full page ──────────────────────────────────────────────
function renderPage(rows) {
  const noteCount = rows.length;
  const todayCount = rows.filter(n => {
    const d = new Date(n.creado_en);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;
  const totalChars = rows.reduce((sum, n) => sum + (n.contenido ? n.contenido.length : 0) + n.titulo.length, 0);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Cosmos Notes — A stunning sci-fi note-taking experience powered by the stars">
  <title>Cosmos Notes ✦</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    /* ═══════════════════════════════════════════════════════════
       COSMOS NOTES — Design System
       ═══════════════════════════════════════════════════════════ */

    :root {
      /* Core palette */
      --void: #050510;
      --deep-space: #0a0a1a;
      --nebula-dark: #0d0d24;
      --nebula-mid: #12122e;
      --star-dust: #1a1a3e;

      /* Accent neons */
      --cyan-glow: #00f0ff;
      --cyan-dim: #00b8c9;
      --purple-glow: #a855f7;
      --purple-dim: #7c3aed;
      --pink-glow: #f472b6;
      --amber-glow: #fbbf24;

      /* Text */
      --text-primary: #e8eaf6;
      --text-secondary: #8892b0;
      --text-muted: #4a5078;

      /* Glass */
      --glass-bg: rgba(15, 15, 40, 0.65);
      --glass-border: rgba(0, 240, 255, 0.12);
      --glass-hover: rgba(0, 240, 255, 0.06);

      /* Sizing */
      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 20px;
      --radius-xl: 28px;
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
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
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

    /* ─── Ambient Nebula Glow ────────────────────────────── */
    .nebula-orb {
      position: fixed;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.15;
      pointer-events: none;
      z-index: 0;
      animation: nebulaPulse 8s ease-in-out infinite alternate;
    }
    .nebula-orb--cyan {
      width: 500px;
      height: 500px;
      background: var(--cyan-glow);
      top: -100px;
      right: -100px;
    }
    .nebula-orb--purple {
      width: 600px;
      height: 600px;
      background: var(--purple-glow);
      bottom: -200px;
      left: -150px;
      animation-delay: 3s;
    }
    .nebula-orb--pink {
      width: 300px;
      height: 300px;
      background: var(--pink-glow);
      top: 50%;
      left: 50%;
      animation-delay: 5s;
    }

    @keyframes nebulaPulse {
      0%   { opacity: 0.1; transform: scale(1); }
      100% { opacity: 0.22; transform: scale(1.15); }
    }

    /* ─── Main Layout ────────────────────────────────────── */
    .cosmos-app {
      position: relative;
      z-index: 1;
      max-width: 900px;
      margin: 0 auto;
      padding: 30px 24px 80px;
    }

    /* ─── Header / Brand ─────────────────────────────────── */
    .cosmos-header {
      text-align: center;
      margin-bottom: 40px;
      animation: fadeInDown 0.8s ease-out;
    }

    .cosmos-logo {
      display: inline-flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 8px;
    }

    .cosmos-logo__icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--cyan-glow), var(--purple-glow));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 0 30px rgba(0, 240, 255, 0.3), 0 0 60px rgba(168, 85, 247, 0.15);
      animation: iconPulse 3s ease-in-out infinite;
    }

    @keyframes iconPulse {
      0%, 100% { box-shadow: 0 0 30px rgba(0, 240, 255, 0.3), 0 0 60px rgba(168, 85, 247, 0.15); }
      50%      { box-shadow: 0 0 40px rgba(0, 240, 255, 0.5), 0 0 80px rgba(168, 85, 247, 0.25); }
    }

    .cosmos-logo__text {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -1px;
      background: linear-gradient(135deg, var(--cyan-glow), var(--purple-glow), var(--pink-glow));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .cosmos-header__sub {
      font-size: 14px;
      color: var(--text-muted);
      font-weight: 400;
      letter-spacing: 3px;
      text-transform: uppercase;
    }

    /* ─── Connection Badge ───────────────────────────────── */
    .conn-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 6px 16px;
      border-radius: 100px;
      background: rgba(0, 240, 255, 0.06);
      border: 1px solid rgba(0, 240, 255, 0.15);
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--cyan-dim);
      animation: fadeIn 1s ease-out 0.3s both;
    }

    .conn-badge__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 8px #22c55e;
      animation: blink 2s ease-in-out infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    /* ─── Stats Dashboard ────────────────────────────────── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 32px;
      animation: fadeInUp 0.7s ease-out 0.2s both;
    }

    .stat-card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-md);
      padding: 18px 16px;
      text-align: center;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
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
      transition: opacity 0.3s ease;
    }

    .stat-card:hover::before {
      opacity: 1;
    }

    .stat-card:hover {
      border-color: rgba(0, 240, 255, 0.25);
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(0, 240, 255, 0.08);
    }

    .stat-card__number {
      font-size: 28px;
      font-weight: 800;
      background: linear-gradient(135deg, var(--cyan-glow), var(--purple-glow));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
      margin-bottom: 6px;
    }

    .stat-card__label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 600;
    }

    /* ─── Glass Panel (form container) ───────────────────── */
    .glass-panel {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      padding: 28px;
      margin-bottom: 36px;
      position: relative;
      overflow: hidden;
      animation: fadeInUp 0.7s ease-out 0.35s both;
    }

    .glass-panel::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.3), transparent);
    }

    .panel-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--text-primary);
    }

    .panel-title__icon {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(168, 85, 247, 0.15));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    /* ─── Form Elements ──────────────────────────────────── */
    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .form-input,
    .form-textarea {
      width: 100%;
      padding: 12px 16px;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-primary);
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      transition: all 0.3s ease;
      outline: none;
    }

    .form-input:focus,
    .form-textarea:focus {
      border-color: var(--cyan-glow);
      background: rgba(0, 240, 255, 0.04);
      box-shadow: 0 0 0 3px rgba(0, 240, 255, 0.08), 0 0 20px rgba(0, 240, 255, 0.06);
    }

    .form-input::placeholder,
    .form-textarea::placeholder {
      color: var(--text-muted);
    }

    .form-textarea {
      resize: vertical;
      min-height: 80px;
    }

    /* ─── Submit Button ──────────────────────────────────── */
    .btn-submit {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 12px 28px;
      border: none;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, var(--cyan-glow), var(--purple-glow));
      color: var(--void);
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
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
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s ease;
    }

    .btn-submit:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(0, 240, 255, 0.35), 0 0 60px rgba(0, 240, 255, 0.1);
    }

    .btn-submit:hover::before {
      left: 100%;
    }

    .btn-submit:active {
      transform: translateY(0);
    }

    /* ─── Notes Section Header ───────────────────────────── */
    .notes-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      animation: fadeInUp 0.7s ease-out 0.5s both;
    }

    .notes-header__title {
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .notes-header__count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 28px;
      padding: 0 8px;
      border-radius: 100px;
      background: linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(168, 85, 247, 0.15));
      font-size: 12px;
      font-weight: 700;
      color: var(--cyan-glow);
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
      padding: 22px 24px;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      position: relative;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      animation: noteSlideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .note-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 3px;
      height: 100%;
      background: linear-gradient(180deg, var(--cyan-glow), var(--purple-glow));
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .note-card:hover {
      border-color: rgba(0, 240, 255, 0.2);
      transform: translateX(4px);
      box-shadow: 0 4px 24px rgba(0, 240, 255, 0.06), -4px 0 20px rgba(0, 240, 255, 0.04);
    }

    .note-card:hover::before {
      opacity: 1;
    }

    @keyframes noteSlideIn {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.98);
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
      margin-bottom: 8px;
    }

    .note-card__title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.4;
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

    .btn-delete {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(244, 63, 94, 0.2);
      background: rgba(244, 63, 94, 0.06);
      color: #f43f5e;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: all 0.3s ease;
    }

    .btn-delete:hover {
      background: rgba(244, 63, 94, 0.15);
      border-color: rgba(244, 63, 94, 0.4);
      box-shadow: 0 0 16px rgba(244, 63, 94, 0.15);
      transform: scale(1.1);
    }

    .note-card__body {
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.65;
      margin-bottom: 12px;
    }

    .note-card__empty {
      font-style: italic;
      color: var(--text-muted);
    }

    .note-card__footer {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--text-muted);
    }

    .note-card__footer-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--purple-glow);
      opacity: 0.5;
    }

    .note-card__id {
      color: var(--purple-dim);
    }

    /* ─── Empty State ────────────────────────────────────── */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      animation: fadeInUp 0.7s ease-out 0.5s both;
    }

    .empty-state__icon {
      font-size: 56px;
      margin-bottom: 16px;
      animation: float 4s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-12px); }
    }

    .empty-state__title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .empty-state__text {
      font-size: 14px;
      color: var(--text-muted);
    }

    /* ─── Toast / Notification ───────────────────────────── */
    .toast {
      position: fixed;
      bottom: 30px;
      right: 30px;
      padding: 14px 24px;
      border-radius: var(--radius-md);
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      color: var(--text-primary);
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 1000;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .toast--visible {
      transform: translateY(0);
      opacity: 1;
    }

    .toast--success {
      border-color: rgba(34, 197, 94, 0.3);
      box-shadow: 0 0 24px rgba(34, 197, 94, 0.1);
    }

    .toast--error {
      border-color: rgba(244, 63, 94, 0.3);
      box-shadow: 0 0 24px rgba(244, 63, 94, 0.1);
    }

    /* ─── Delete Confirm Modal ───────────────────────────── */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(5, 5, 16, 0.75);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }

    .modal-overlay--active {
      opacity: 1;
      pointer-events: all;
    }

    .modal {
      background: var(--nebula-dark);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      padding: 32px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      transform: scale(0.9) translateY(20px);
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .modal-overlay--active .modal {
      transform: scale(1) translateY(0);
    }

    .modal__icon {
      font-size: 40px;
      margin-bottom: 16px;
    }

    .modal__title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .modal__text {
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 24px;
    }

    .modal__actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .btn-modal {
      padding: 10px 24px;
      border-radius: var(--radius-sm);
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
    }

    .btn-modal--cancel {
      background: rgba(255,255,255,0.06);
      color: var(--text-secondary);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .btn-modal--cancel:hover {
      background: rgba(255,255,255,0.1);
    }

    .btn-modal--danger {
      background: linear-gradient(135deg, #f43f5e, #e11d48);
      color: white;
    }

    .btn-modal--danger:hover {
      box-shadow: 0 4px 20px rgba(244, 63, 94, 0.4);
      transform: translateY(-1px);
    }

    /* ─── Scrollbar ──────────────────────────────────────── */
    ::-webkit-scrollbar {
      width: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(0, 240, 255, 0.15);
      border-radius: 100px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 240, 255, 0.25);
    }

    /* ─── Footer ─────────────────────────────────────────── */
    .cosmos-footer {
      text-align: center;
      padding: 40px 0 0;
      font-size: 12px;
      color: var(--text-muted);
      animation: fadeIn 1s ease-out 0.8s both;
    }

    .cosmos-footer a {
      color: var(--cyan-dim);
      text-decoration: none;
    }

    /* ─── Animations ─────────────────────────────────────── */
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes fadeInDown {
      from { opacity: 0; transform: translateY(-20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ─── Responsive ─────────────────────────────────────── */
    @media (max-width: 640px) {
      .cosmos-app {
        padding: 20px 16px 60px;
      }
      .stats-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .stat-card {
        padding: 14px 8px;
      }
      .stat-card__number {
        font-size: 22px;
      }
      .glass-panel {
        padding: 20px 16px;
      }
      .cosmos-logo__text {
        font-size: 24px;
      }
      .note-card__actions {
        opacity: 1;
      }
    }

    /* ─── Form submission animation ──────────────────────── */
    .btn-submit.is-loading {
      pointer-events: none;
      opacity: 0.7;
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

    /* ─── Keyboard shortcut hint ─────────────────────────── */
    .kbd-hint {
      display: none;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 10px;
    }

    @media (min-width: 768px) {
      .kbd-hint {
        display: block;
      }
    }
  </style>
</head>
<body>

  <!-- Starfield -->
  <canvas id="starfield"></canvas>

  <!-- Nebula ambient orbs -->
  <div class="nebula-orb nebula-orb--cyan"></div>
  <div class="nebula-orb nebula-orb--purple"></div>
  <div class="nebula-orb nebula-orb--pink"></div>

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
        <div class="stat-card__number">${noteCount}</div>
        <div class="stat-card__label">Total Notes</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__number">${todayCount}</div>
        <div class="stat-card__label">Today</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__number">${totalChars.toLocaleString()}</div>
        <div class="stat-card__label">Characters</div>
      </div>
    </div>

    <!-- New Note Form -->
    <div class="glass-panel">
      <div class="panel-title">
        <div class="panel-title__icon">✍</div>
        Launch a New Note
      </div>
      <form method="POST" action="/notas" id="noteForm">
        <div class="form-group">
          <label class="form-label" for="titulo">Title</label>
          <input class="form-input" type="text" id="titulo" name="titulo" placeholder="What's on your mind?" required autocomplete="off">
        </div>
        <div class="form-group">
          <label class="form-label" for="contenido">Content</label>
          <textarea class="form-textarea" id="contenido" name="contenido" rows="3" placeholder="Capture your thoughts into the cosmos..."></textarea>
        </div>
        <button class="btn-submit" type="submit" id="submitBtn">
          <span>🚀</span>
          <span>Launch Note</span>
        </button>
        <div class="kbd-hint">Pro tip: Press <strong>Ctrl + Enter</strong> to submit</div>
      </form>
    </div>

    <!-- Notes List -->
    <div class="notes-header">
      <h2 class="notes-header__title">
        Stellar Log
        <span class="notes-header__count">${noteCount}</span>
      </h2>
    </div>

    ${noteCount > 0 ? `
    <div class="notes-grid">
      ${rows.map((nota, i) => `
        <div class="note-card" style="animation-delay: ${0.55 + (i * 0.08)}s" data-id="${nota.id}">
          <div class="note-card__top">
            <div class="note-card__title">${esc(nota.titulo)}</div>
            <div class="note-card__actions">
              <button class="btn-delete" onclick="confirmDelete(${nota.id}, '${esc(nota.titulo).replace(/'/g, "\\'")}')" title="Delete note" aria-label="Delete note">🗑</button>
            </div>
          </div>
          <div class="note-card__body">
            ${nota.contenido ? esc(nota.contenido) : '<span class="note-card__empty">No content</span>'}
          </div>
          <div class="note-card__footer">
            <span class="note-card__id">#${nota.id}</span>
            <span class="note-card__footer-dot"></span>
            <span>${timeAgo(nota.creado_en)}</span>
            <span class="note-card__footer-dot"></span>
            <span>${new Date(nota.creado_en).toLocaleString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      `).join('')}
    </div>
    ` : `
    <div class="empty-state">
      <div class="empty-state__icon">🪐</div>
      <div class="empty-state__title">The cosmos is quiet</div>
      <div class="empty-state__text">Launch your first note to light up the stars</div>
    </div>
    `}

    <footer class="cosmos-footer">
      Cosmos Notes ✦ Powered by Express + MySQL · ${new Date().getFullYear()}
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

  <!-- Toast -->
  <div class="toast" id="toast"></div>

  <script>
    // ═══════════════════════════════════════════════════════════
    // STARFIELD — animated canvas background
    // ═══════════════════════════════════════════════════════════
    (function() {
      const canvas = document.getElementById('starfield');
      const ctx = canvas.getContext('2d');
      let stars = [];
      let shootingStars = [];
      const STAR_COUNT = 220;
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
            radius: Math.random() * 1.5 + 0.3,
            alpha: Math.random() * 0.8 + 0.2,
            speed: Math.random() * 0.0008 + 0.0002,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }

      function spawnShootingStar() {
        if (Math.random() < 0.003 && shootingStars.length < 2) {
          shootingStars.push({
            x: Math.random() * w * 0.7,
            y: Math.random() * h * 0.5,
            len: Math.random() * 60 + 40,
            speed: Math.random() * 6 + 4,
            alpha: 1,
          });
        }
      }

      function draw() {
        ctx.clearRect(0, 0, w, h);
        const time = Date.now();

        // Static stars with twinkle
        for (const star of stars) {
          const twinkle = Math.sin(time * star.speed + star.phase) * 0.4 + 0.6;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
          ctx.fillStyle = \`rgba(200, 220, 255, \${star.alpha * twinkle})\`;
          ctx.fill();
        }

        // Shooting stars
        spawnShootingStar();
        for (let i = shootingStars.length - 1; i >= 0; i--) {
          const ss = shootingStars[i];
          const gradient = ctx.createLinearGradient(
            ss.x, ss.y, ss.x - ss.len, ss.y - ss.len * 0.3
          );
          gradient.addColorStop(0, \`rgba(0, 240, 255, \${ss.alpha})\`);
          gradient.addColorStop(1, 'rgba(0, 240, 255, 0)');

          ctx.beginPath();
          ctx.moveTo(ss.x, ss.y);
          ctx.lineTo(ss.x - ss.len, ss.y - ss.len * 0.3);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ss.x += ss.speed;
          ss.y += ss.speed * 0.3;
          ss.alpha -= 0.012;

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
    // FORM — Ctrl+Enter shortcut & loading state
    // ═══════════════════════════════════════════════════════════
    const noteForm = document.getElementById('noteForm');
    const submitBtn = document.getElementById('submitBtn');

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const titulo = document.getElementById('titulo');
        if (titulo.value.trim()) {
          noteForm.submit();
        }
      }
    });

    noteForm.addEventListener('submit', () => {
      submitBtn.classList.add('is-loading');
      submitBtn.querySelector('span:last-child').textContent = 'Launching...';
    });

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

    // Close modal on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
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
            card.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            card.style.transform = 'translateX(60px) scale(0.95)';
            card.style.opacity = '0';
            setTimeout(() => location.reload(), 400);
          } else {
            location.reload();
          }
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
    // TOAST — notification system
    // ═══════════════════════════════════════════════════════════
    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast');
      toast.innerHTML = \`\${type === 'success' ? '✅' : '❌'} \${message}\`;
      toast.className = \`toast toast--visible toast--\${type}\`;
      setTimeout(() => {
        toast.classList.remove('toast--visible');
      }, 3000);
    }

    // Show success toast if we just created a note (check URL for redirect)
    if (document.referrer && new URL(document.referrer).pathname === '/') {
      // Skip — we're just loading normally
    }

    // ═══════════════════════════════════════════════════════════
    // Auto-focus title input
    // ═══════════════════════════════════════════════════════════
    document.getElementById('titulo').focus();
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
    const { titulo, contenido } = req.body;
    await pool.execute('INSERT INTO notas (titulo, contenido) VALUES (?, ?)', [titulo, contenido || null]);
    res.redirect('/');
  } catch (err) {
    res.status(500).send(`Error al guardar: ${err.message}`);
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

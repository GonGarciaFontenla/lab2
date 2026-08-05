const { esc, timeAgo, CATEGORIES } = require('../helpers');
const { dbConfig } = require('../config/db');

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
  <meta name="description" content="Tera Notes — A stunning sci-fi note-taking experience powered by Teraclaude">
  <title>Tera Notes ✦</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>

  <!-- Starfield -->
  <canvas id="starfield"></canvas>

  <!-- Rocket Canvas -->
  <canvas id="rocketCanvas"></canvas>

  <!-- Planets -->
  <canvas id="planetsCanvas"></canvas>

  <!-- Grid overlay -->
  <div class="grid-overlay"></div>

  <!-- Nebula ambient orbs (parallax-reactive) -->
  <div class="nebula-orb nebula-orb--cyan" id="nebulaCyan"></div>
  <div class="nebula-orb nebula-orb--purple" id="nebulaPurple"></div>
  <div class="nebula-orb nebula-orb--pink" id="nebulaPink"></div>
  <div class="nebula-orb nebula-orb--green" id="nebulaGreen"></div>

  <!-- Main App -->
  <div class="cosmos-app">

    <!-- Compact Header -->
    <header class="cosmos-header">
      <div class="cosmos-header__left">
        <div class="cosmos-logo">
          <div class="cosmos-logo__icon">🚀</div>
          <h1 class="cosmos-logo__text">Tera Notes</h1>
        </div>
      </div>
      <div class="cosmos-header__right">
        <div class="conn-badge">
          <span class="conn-badge__dot"></span>
          ${esc(dbConfig.host)} · ${esc(dbConfig.database)}
        </div>
      </div>
    </header>

    <!-- Compact Inline Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-card__icon">📝</span>
        <div class="stat-card__number" data-count="${noteCount}">0</div>
        <div class="stat-card__label">Notes</div>
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

    <!-- Toolbar: Search + New Note Button -->
    <div class="toolbar-row">
      <div class="search-bar" id="searchBar">
        <span class="search-bar__icon">🔍</span>
        <input class="search-bar__input" type="text" id="searchInput" placeholder="Search your cosmos..." autocomplete="off">
        <span class="search-bar__kbd">/</span>
        <button class="search-bar__clear" id="searchClear" type="button" aria-label="Clear search">✕</button>
      </div>
      <button class="fab-new-note" id="fabNewNote" type="button" aria-label="New note">
        <span class="fab-new-note__icon">✚</span>
        <span>New Note</span>
      </button>
    </div>

    <!-- Collapsible Form Panel -->
    <div class="form-panel-wrapper" id="formPanelWrapper">
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
            <div class="form-group" style="width: 150px; flex-shrink: 0;">
              <label class="form-label" for="category">Category</label>
              <select class="form-select" id="category" name="category">
                ${Object.entries(CATEGORIES).map(([key, cat]) => `<option value="${key}" ${key === 'nebula' ? 'selected' : ''}>${cat.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="contenido">Content</label>
            <textarea class="form-textarea" id="contenido" name="contenido" rows="2" placeholder="Capture your thoughts..."></textarea>
          </div>
          <div class="form-actions">
            <button class="btn-submit" type="submit" id="submitBtn">
              <span>🚀</span>
              <span>Launch Note</span>
            </button>
            <span class="cosmos-footer__shortcut" style="font-size:10px;color:var(--text-muted)">
              <kbd>Ctrl</kbd>+<kbd>Enter</kbd> submit · <kbd>Esc</kbd> close
            </span>
          </div>
        </form>
      </div>
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
                <button class="btn-icon btn-icon--delete" onclick="confirmDelete(${nota.id}, '${esc(nota.titulo).replace(/'/g, "\\\\'")}')" title="Delete note" aria-label="Delete note">🗑️</button>
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
              <button class="btn-icon btn-icon--delete" onclick="confirmDelete(${nota.id}, '${esc(nota.titulo).replace(/'/g, "\\\\'")}')" title="Delete note" aria-label="Delete note">🗑️</button>
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
      Tera Notes ✦ Powered by Teraclaude & Express + MySQL · ${new Date().getFullYear()}
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

  <script src="/js/app.js"></script>
</body>
</html>`;
}

module.exports = { renderPage };

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

module.exports = { esc, timeAgo, CATEGORIES };

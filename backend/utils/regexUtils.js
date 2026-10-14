function escapeRegex(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeSearchQuery(q, maxLength = 200) {
  if (typeof q !== 'string') return '';
  return escapeRegex(q.trim().slice(0, maxLength));
}

module.exports = { escapeRegex, sanitizeSearchQuery };

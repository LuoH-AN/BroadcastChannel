// Highlight search terms in assembled post content. Only visible text is
// wrapped — tags and attribute values are left untouched by splitting the HTML
// into tag and text segments. Prism-highlighted code uses entity-encoded angle
// brackets, so it is safe to transform those text segments too.

export function escapeRegExp(string = ''): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function highlightSearchTerm(html = '', q = ''): string {
  if (!q) {
    return html
  }

  const pattern = new RegExp(`(${escapeRegExp(q)})`, 'gi')
  return html
    .split(/(<[^>]+>)/)
    .map(segment => (segment.startsWith('<') ? segment : segment.replace(pattern, '<mark class="search-highlight">$1</mark>')))
    .join('')
}

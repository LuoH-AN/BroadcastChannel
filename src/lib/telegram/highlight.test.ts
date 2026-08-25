import { describe, expect, it } from 'vitest'
import { escapeRegExp, highlightSearchTerm } from './highlight'

describe('highlightSearchTerm', () => {
  it('wraps matches in visible text only', () => {
    const result = highlightSearchTerm('<p>Hello world</p>', 'world')
    expect(result).toBe('<p>Hello <mark class="search-highlight">world</mark></p>')
  })

  it('is case-insensitive', () => {
    const result = highlightSearchTerm('<p>HELLO world</p>', 'hello')
    expect(result).toContain('<mark class="search-highlight">HELLO</mark>')
  })

  it('does not touch tags or attributes', () => {
    const result = highlightSearchTerm('<a href="/hello" title="hello">link</a>', 'hello')
    expect(result).toBe('<a href="/hello" title="hello">link</a>')
  })

  it('highlights all occurrences and handles regex metacharacters', () => {
    const result = highlightSearchTerm('<p>a.c and a.c</p>', 'a.c')
    expect(result.match(/<mark class="search-highlight">a\.c<\/mark>/g)).toHaveLength(2)
  })

  it('returns html unchanged for empty query', () => {
    expect(highlightSearchTerm('<p>text</p>', '')).toBe('<p>text</p>')
  })
})

describe('escapeRegExp', () => {
  it('escapes all regex metacharacters', () => {
    expect(escapeRegExp('a.c*+?^${}()|[]\\')).toBe('a\\.c\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\')
  })
})

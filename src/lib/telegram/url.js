// HTML entity decoding + URL normalization helpers.
//
// Telegram message HTML occasionally lands with entity-encoded characters inside
// URL attributes (e.g. an encoded `javascript:` scheme), which can be used to
// smuggle payloads past naive sanitization. These helpers decode such entities
// and normalize href/src/poster/srcset/style URL values before they are proxied
// or emitted, closing that bypass.

const MAX_ENTITY_DECODE_PASSES = 3
const HTML_ENTITY_REGEX = /&(?:#(\d+)|#x([\da-f]+)|([a-z][\da-z]+));/gi
const STYLE_DOUBLE_QUOTED_URL_REGEX = /url\("([^"]*)"\)/gi
const STYLE_SINGLE_QUOTED_URL_REGEX = /url\('([^']*)'\)/gi
const STYLE_UNQUOTED_URL_REGEX = /url\(([^)"']*)\)/gi
const URL_ATTRIBUTE_NAMES = ['href', 'src', 'poster', 'action', 'formaction', 'data-webp']
const HTML_ENTITY_MAP = {
  amp: '&',
  apos: '\'',
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
}

function decodeHtmlEntityReferences(value) {
  return value.replace(HTML_ENTITY_REGEX, (match, decimal, hex, named) => {
    if (decimal || hex) {
      const codePoint = Number.parseInt(decimal ?? hex ?? '', decimal ? 10 : 16)

      if (!Number.isFinite(codePoint)) {
        return match
      }

      try {
        return String.fromCodePoint(codePoint)
      }
      catch {
        return match
      }
    }

    return named ? HTML_ENTITY_MAP[named.toLowerCase()] ?? match : match
  })
}

export function normalizeUrlAttribute(value) {
  let normalized = value

  for (let pass = 0; pass < MAX_ENTITY_DECODE_PASSES; pass += 1) {
    const decoded = decodeHtmlEntityReferences(normalized)

    if (decoded === normalized) {
      break
    }

    normalized = decoded
  }

  return normalized
}

export function getProxiedUrl(staticProxy, url) {
  return staticProxy + normalizeUrlAttribute(url)
}

export function normalizeSrcsetAttribute(srcset) {
  return srcset
    .split(',')
    .map((candidate) => {
      const [url, ...descriptors] = candidate.trim().split(/\s+/)

      if (!url) {
        return ''
      }

      return [normalizeUrlAttribute(url), ...descriptors].join(' ')
    })
    .filter(Boolean)
    .join(', ')
}

function normalizeStyleUrls(style) {
  return style
    .replace(STYLE_DOUBLE_QUOTED_URL_REGEX, (_match, url) => `url("${normalizeUrlAttribute(url)}")`)
    .replace(STYLE_SINGLE_QUOTED_URL_REGEX, (_match, url) => `url('${normalizeUrlAttribute(url)}')`)
    .replace(STYLE_UNQUOTED_URL_REGEX, (_match, url) => `url(${normalizeUrlAttribute(url.trim())})`)
}

export function normalizeUrlAttributes($, root) {
  const nodes = [...root.toArray(), ...root.find('*').toArray()]

  for (const node of nodes) {
    const element = $(node)

    for (const attributeName of URL_ATTRIBUTE_NAMES) {
      const value = element.attr(attributeName)

      if (value) {
        element.attr(attributeName, normalizeUrlAttribute(value))
      }
    }

    const srcset = element.attr('srcset')

    if (srcset) {
      element.attr('srcset', normalizeSrcsetAttribute(srcset))
    }

    const style = element.attr('style')

    if (style) {
      element.attr('style', normalizeStyleUrls(style))
    }
  }
}

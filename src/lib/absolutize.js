import * as cheerio from 'cheerio'

// Rewrite relative URLs inside an HTML fragment to absolute ones.
//
// RSS/Atom readers consume `content` / `content:encoded` without any base-URL
// context, so a site-relative path like `/static/...` cannot be resolved and
// the media fails to load. Feed generators only absolutize their own item
// links, not the embedded HTML, so we do it here against the site origin.
export function absolutizeHtml(html, origin) {
  if (!origin || !html) {
    return html
  }

  const base = origin.endsWith('/') ? origin.slice(0, -1) : origin
  const isRelative = value => Boolean(value) && value.startsWith('/') && !value.startsWith('//')

  const $ = cheerio.load(html, null, false)

  $('*').each((_index, element) => {
    const node = $(element)

    for (const attr of ['src', 'href', 'poster']) {
      const value = node.attr(attr)

      if (isRelative(value)) {
        node.attr(attr, `${base}${value}`)
      }
    }

    const srcset = node.attr('srcset')

    if (srcset) {
      const rewritten = srcset
        .split(',')
        .map((candidate) => {
          const [url, ...descriptors] = candidate.trim().split(/\s+/)

          if (isRelative(url)) {
            return [`${base}${url}`, ...descriptors].join(' ')
          }

          return candidate.trim()
        })
        .filter(Boolean)
        .join(', ')

      node.attr('srcset', rewritten)
    }

    const style = node.attr('style')

    if (style && style.includes('url(')) {
      node.attr(
        'style',
        style.replace(/url\((["']?)([^)"']+)\1\)/g, (match, quote, url) => {
          const trimmed = url.trim()

          if (isRelative(trimmed)) {
            return `url(${quote}${base}${trimmed}${quote})`
          }

          return match
        }),
      )
    }
  })

  return $.html()
}

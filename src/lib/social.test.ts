import { describe, expect, it } from 'vitest'
import { buildSocialLinks } from './social'

describe('rss navigation', () => {
  it('links to the XML subscription by default', () => {
    expect(buildSocialLinks({ rssUrl: '/blog/rss.xml' })[0]).toMatchObject({
      href: '/blog/rss.xml',
      type: 'application/rss+xml',
      rel: 'alternate noopener noreferrer',
    })
  })

  it('opens the HTML preview while preserving base paths and encoded tags', () => {
    const rssUrl = 'https://example.com/blog/rss.xml?tag=%E4%B8%AD%E6%96%87%20%26%20RSS'
    expect(buildSocialLinks({ rssUrl, rssPreview: true })[0]).toMatchObject({
      href: 'https://example.com/blog/rss?tag=%E4%B8%AD%E6%96%87%20%26%20RSS',
      type: 'text/html',
      rel: 'noopener noreferrer',
    })
  })
})

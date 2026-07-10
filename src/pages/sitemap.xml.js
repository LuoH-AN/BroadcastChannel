import { escapeXml, getLatestPostId, getSitemapCursors } from '../lib/sitemap'
import { getChannelInfo } from '../lib/telegram'

export async function GET(Astro) {
  const { SITE_ORIGIN } = Astro.locals
  const channel = await getChannelInfo(Astro)
  const posts = channel.posts || []

  const latestPostId = Math.max(getLatestPostId(posts), Number(channel.latestMessageId) || 0)
  const pages = getSitemapCursors(latestPostId)

  const sitemaps = pages.map((page) => {
    return `
<sitemap>
  <loc>${escapeXml(`${SITE_ORIGIN}/sitemap/${page}.xml`)}</loc>
</sitemap>`
  })

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemaps.join('')}
</sitemapindex>`, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}

import { escapeXml, getPostsForSitemapCursor } from '../../lib/sitemap'
import { getChannelInfo } from '../../lib/telegram'

export async function GET(Astro) {
  const { SITE_ORIGIN } = Astro.locals
  const cursor = Number(Astro.params.cursor)

  if (!Number.isSafeInteger(cursor) || cursor < 2)
    return new Response('Not Found', { status: 404 })

  const channel = await getChannelInfo(Astro, {
    before: cursor,
  })
  const posts = getPostsForSitemapCursor(channel.posts || [], cursor)

  const xmlUrls = posts.map((post) => {
    const modifiedAt = new Date(post.datetime)
    const lastModified = Number.isNaN(modifiedAt.getTime()) ? '' : `<lastmod>${modifiedAt.toISOString()}</lastmod>`

    return `
      <url>
        <loc>${escapeXml(`${SITE_ORIGIN}/posts/${post.id}`)}</loc>
        ${lastModified}
      </url>`
  }).join('')

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${xmlUrls}
</urlset>`, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}

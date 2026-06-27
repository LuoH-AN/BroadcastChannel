import { absolutizeHtml } from '../lib/absolutize'
import { getChannelInfo } from '../lib/telegram'

export async function GET(Astro) {
  const { SITE_ORIGIN } = Astro.locals
  const tag = Astro.url.searchParams.get('tag')
  const channel = await getChannelInfo(Astro, {
    q: tag ? `#${tag}` : '',
  })
  const posts = channel.posts || []

  const jsonData = {
    version: 'https://jsonfeed.org/version/1.1',
    title: `${tag ? `${tag} | ` : ''}${channel.title}`,
    description: channel.description,
    home_page_url: SITE_ORIGIN,
    items: posts.map(item => ({
      url: `${SITE_ORIGIN}/posts/${item.id}`,
      title: item.title,
      description: item.text,
      date_published: new Date(item.datetime),
      tags: item.tags,
      content_html: absolutizeHtml(item.content, SITE_ORIGIN),
    })),
  }

  return new Response(JSON.stringify(jsonData), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

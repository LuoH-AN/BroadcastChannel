import type { APIRoute } from 'astro'
import rss from '@astrojs/rss'
import { getFeedData } from '../lib/feed'
import { sanitizeFeedHtml } from '../lib/sanitize'

export const GET: APIRoute = async (context) => {
  const { channel, posts, siteUrl, title } = await getFeedData(context)

  const response = await rss({
    title,
    description: channel.description,
    site: siteUrl.toString(),
    trailingSlash: false,
    items: posts.map(item => ({
      link: `posts/${item.id}`,
      title: item.title,
      description: item.description,
      pubDate: new Date(item.datetime),
      content: sanitizeFeedHtml(item.content),
    })),
  })

  response.headers.set('Content-Type', 'application/rss+xml; charset=utf-8')
  response.headers.set('Cache-Control', 'public, max-age=3600')

  return response
}

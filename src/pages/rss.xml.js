import rss from '@astrojs/rss'
import sanitizeHtml from 'sanitize-html'
import { absolutizeHtml } from '../lib/absolutize'
import { getBooleanEnv } from '../lib/env'
import { getChannelInfo } from '../lib/telegram'

export async function GET(Astro) {
  const { SITE_ORIGIN } = Astro.locals
  const tag = Astro.url.searchParams.get('tag')
  const channel = await getChannelInfo(Astro, {
    q: tag ? `#${tag}` : '',
  })
  const posts = channel.posts || []

  const response = await rss({
    title: `${tag ? `${tag} | ` : ''}${channel.title}`,
    description: channel.description,
    site: SITE_ORIGIN,
    trailingSlash: false,
    stylesheet: getBooleanEnv(import.meta.env, Astro, 'RSS_BEAUTIFY') ? '/rss.xsl' : undefined,
    items: posts.map(item => ({
      link: `posts/${item.id}`,
      title: item.title,
      description: item.text,
      pubDate: new Date(item.datetime),
      content: absolutizeHtml(sanitizeHtml(item.content, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'video', 'audio']),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          video: ['src', 'width', 'height', 'poster'],
          audio: ['src', 'controls'],
          img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading', 'class'],
        },
        exclusiveFilter(frame) {
          return frame.tag === 'img' && frame.attribs?.class?.includes('modal-img')
        },
      }), SITE_ORIGIN),
    })),
  })

  response.headers.set('Content-Type', 'text/xml')
  response.headers.set('Cache-Control', 'public, max-age=3600')

  return response
}

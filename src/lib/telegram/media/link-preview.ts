import type { CheerioAPI } from 'cheerio'
import type { IndexedStaticProxyOptions, MessageSelection } from '../types'
import { escapeHtmlAttribute, getProxiedUrl, normalizeUrlAttribute } from '../url'
import { getImageLoading, STYLE_URL_REGEX } from './utils'

function normalizeYouTubeVideoId(videoId = ''): string {
  return /^[\w-]{11}$/.test(videoId) ? videoId : ''
}

/**
 * Parse YouTube video ID from URL
 * Supports formats:
 * - youtu.be/xxxxxxxxxxx
 * - youtube.com/watch?v=xxx
 * - m.youtube.com / music.youtube.com
 * - /embed/xxx /shorts/xxx /live/xxx
 */
function getYouTubeVideoId(urlString = ''): string {
  try {
    const url = new URL(urlString)
    const hostname = url.hostname.replace(/^www\./, '')

    if (hostname === 'youtu.be') {
      return normalizeYouTubeVideoId(url.pathname.split('/').filter(Boolean)[0] ?? '')
    }

    if (['youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(hostname)) {
      if (url.pathname === '/watch') {
        return normalizeYouTubeVideoId(url.searchParams.get('v') || '')
      }

      return normalizeYouTubeVideoId(url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1] || '')
    }
  }
  catch {
    return ''
  }

  return ''
}

interface BilibiliVideoId {
  bvid?: string
  aid?: string
}

/**
 * Parse Bilibili video ID from URL
 * Supports formats:
 * - www.bilibili.com/video/BVxxxxxx
 * - www.bilibili.com/video/avxxxxxx
 * - b23.tv/xxxxxx (short link)
 * - m.bilibili.com/video/BVxxxxxx
 */
function getBilibiliVideoId(urlString = ''): BilibiliVideoId | null {
  try {
    const url = new URL(urlString)
    const hostname = url.hostname.replace(/^www\./, '')

    // Short link format: b23.tv/xxxxxx
    if (hostname === 'b23.tv') {
      const pathId = url.pathname.split('/').filter(Boolean)[0]
      if (pathId) {
        // Could be BV or av format
        if (pathId.startsWith('BV') || pathId.startsWith('bv')) {
          return { bvid: pathId }
        }
        const avMatch = pathId.match(/^(?:av)?(\d+)$/i)
        if (avMatch) {
          return { aid: avMatch[1] }
        }
      }
      return null
    }

    // Standard bilibili format
    if (['bilibili.com', 'm.bilibili.com'].includes(hostname)) {
      // Match /video/BVxxxxxx or /video/avxxxxxx
      const videoMatch = url.pathname.match(/^\/video\/(BV\w+|av(\d+))/i)
      if (videoMatch) {
        if (videoMatch[1].toLowerCase().startsWith('bv')) {
          return { bvid: videoMatch[1] }
        }
        return { aid: videoMatch[2] }
      }
    }
  }
  catch {
    return null
  }

  return null
}

// Once a video link has been turned into an embedded card, strip the source
// link out of the message body so the page shows only the video card.
function removeVideoLinkFromText($: CheerioAPI, message: MessageSelection, isVideoLink: (href: string) => boolean): void {
  for (const linkNode of message.find('.tgme_widget_message_text a[href]').toArray()) {
    const link = $(linkNode)
    if (isVideoLink(link.attr('href') ?? '')) {
      link.remove()
    }
  }
}

interface LinkPreviewVideo {
  videoId: string
  html: string
}

export function getLinkPreviewVideo($: CheerioAPI, message: MessageSelection): LinkPreviewVideo | null {
  const candidateUrls = [
    message.find('.tgme_widget_message_link_preview').attr('href'),
    ...message.find('.tgme_widget_message_text a[href]').map((_index, link) => $(link).attr('href')).get(),
  ].filter((url): url is string => Boolean(url))

  for (const url of candidateUrls) {
    // Check YouTube first
    const youtubeVideoId = getYouTubeVideoId(url)
    if (youtubeVideoId) {
      removeVideoLinkFromText($, message, href => getYouTubeVideoId(href) === youtubeVideoId)
      return {
        videoId: youtubeVideoId,
        html: `<div class="link-preview-video-wrap"><iframe class="link-preview-video" src="https://www.youtube-nocookie.com/embed/${youtubeVideoId}" title="YouTube video player" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`,
      }
    }

    // Check Bilibili
    const bilibiliVideoId = getBilibiliVideoId(url)
    if (bilibiliVideoId) {
      const bilibiliKey = bilibiliVideoId.bvid || bilibiliVideoId.aid
      removeVideoLinkFromText($, message, (href) => {
        const video = getBilibiliVideoId(href)
        return Boolean(video) && (video.bvid || video.aid) === bilibiliKey
      })
      // Bilibili embed URL format: //player.bilibili.com/player.html?bvid=BVxxxxxx or aid=xxx
      const embedSrc = bilibiliVideoId.bvid
        ? `//player.bilibili.com/player.html?bvid=${bilibiliVideoId.bvid}&high_quality=1&danmaku=0`
        : `//player.bilibili.com/player.html?aid=${bilibiliVideoId.aid}&high_quality=1&danmaku=0`

      return {
        videoId: bilibiliKey,
        html: `<div class="link-preview-video-wrap link-preview-video-bilibili"><iframe class="link-preview-video" src="${embedSrc}" title="Bilibili video player" loading="lazy" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen></iframe></div>`,
      }
    }
  }

  return null
}

export function getLinkPreview($: CheerioAPI, message: MessageSelection, options: IndexedStaticProxyOptions): string {
  const { staticProxy = '', index = 0 } = options
  const link = message.find('.tgme_widget_message_link_preview')
  const href = link.attr('href')
  const title = message.find('.link_preview_title').text() || message.find('.link_preview_site_name').text()
  const description = message.find('.link_preview_description').text()
  const loading = getImageLoading(index)
  const safeTitle = escapeHtmlAttribute(title || 'Link preview image')

  if (href) {
    link.attr('href', normalizeUrlAttribute(href))
  }

  link.attr('target', '_blank').attr('rel', 'noopener').attr('title', description)

  const image = message.find('.link_preview_image')
  const previewUrl = image.attr('style')?.match(STYLE_URL_REGEX)?.[1]
  const imageSrc = previewUrl ? getProxiedUrl(staticProxy, previewUrl) : ''

  image.replaceWith(
    `<img class="link_preview_image" alt="${safeTitle}" src="${imageSrc}" width="1200" height="630" loading="${loading}" />`,
  )

  return $.html(link)
}

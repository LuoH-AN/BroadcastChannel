import * as cheerio from 'cheerio'
import flourite from 'flourite'
import { LRUCache } from 'lru-cache'
import { $fetch } from 'ofetch'
import { getBooleanEnv, getEnv } from '../env'
import prism from '../prism'
import { normalizeUrlAttribute, normalizeUrlAttributes } from './url'

const CACHE_FRESH_TTL = 1000 * 60 * 5
const CACHE_STALE_TTL = 1000 * 60 * 60
const TELEGRAM_REQUEST_TIMEOUT = 10_000

const cache = new LRUCache({
  ttl: CACHE_STALE_TTL,
  maxSize: 50 * 1024 * 1024, // 50MB
  sizeCalculation: (item) => {
    return JSON.stringify(item).length
  },
})

const telegramHeaderAllowlist = [
  'accept',
  'accept-language',
  'user-agent',
]

function cloneResult(result) {
  return JSON.parse(JSON.stringify(result))
}

function getTelegramHeaders(headers) {
  const allowedHeaders = {}

  for (const name of telegramHeaderAllowlist) {
    const value = headers.get(name)
    if (value)
      allowedHeaders[name] = value
  }

  return allowedHeaders
}

function getCachedResult(cacheKey) {
  const cached = cache.get(cacheKey)
  if (!cached)
    return null

  return {
    data: cloneResult(cached.data),
    isFresh: Date.now() - cached.cachedAt < CACHE_FRESH_TTL,
  }
}

function setCachedResult(cacheKey, data) {
  cache.set(cacheKey, {
    cachedAt: Date.now(),
    data: cloneResult(data),
  })
}

function serveStaleOrThrow(cachedResult, error, details) {
  if (!cachedResult)
    throw error

  console.warn('Telegram request failed, serving stale cache', {
    ...details,
    error: error instanceof Error ? error.message : String(error),
  })
  return cachedResult.data
}

// Normalize emoji variants (e.g., heart variants)
function normalizeEmoji(emoji) {
  const emojiMap = {
    '\u2764': '\u2764\uFE0F',
    '\u263A': '\u263A\uFE0F',
    '\u2639': '\u2639\uFE0F',
    '\u2665': '\u2764\uFE0F',
  }
  return emojiMap[emoji] || emoji
}

function getCustomEmojiImage(emojiId, staticProxy = '') {
  if (!emojiId)
    return null
  const imageUrl = `https://t.me/i/emoji/${emojiId}.webp`
  return `${staticProxy}${imageUrl}`
}

async function hydrateTgEmoji($, content, { staticProxy } = {}) {
  const emojiNodes = $(content).find('tg-emoji')?.toArray() ?? []
  if (!emojiNodes.length)
    return

  await Promise.all(emojiNodes.map((emojiEl) => {
    const emojiId = $(emojiEl).attr('emoji-id')
    if (!emojiId)
      return null

    const imageUrl = getCustomEmojiImage(emojiId, staticProxy)
    if (imageUrl) {
      const imageMarkup = `<img class="tg-emoji" src="${imageUrl}" alt="" loading="lazy" />`
      $(emojiEl).replaceWith(imageMarkup)
    }

    return null
  }))
}

function getVideoStickers($, item, { staticProxy, index }) {
  return $(item).find('.js-videosticker_video')?.map((_index, video) => {
    const url = $(video)?.attr('src')
    const imgurl = $(video).find('img')?.attr('src')
    return `
    <div style="background-image: none; width: 256px;">
      <video src="${staticProxy + url}" width="100%" height="100%" alt="Video Sticker" preload muted autoplay loop playsinline disablepictureinpicture >
        <img class="sticker" src="${staticProxy + imgurl}" alt="Video Sticker" loading="${index > 15 ? 'eager' : 'lazy'}" />
      </video>
    </div>
    `
  })?.get()?.join('')
}

function getImageStickers($, item, { staticProxy, index }) {
  return $(item).find('.tgme_widget_message_sticker')?.map((_index, image) => {
    const url = $(image)?.attr('data-webp')
    return `<img class="sticker" src="${staticProxy + url}" style="width: 256px;" alt="Sticker" loading="${index > 15 ? 'eager' : 'lazy'}" />`
  })?.get()?.join('')
}

const STYLE_DIMENSION_REGEX = {
  width: /width:\s*(\d+(?:\.\d+)?)px/i,
  height: /height:\s*(\d+(?:\.\d+)?)px/i,
}
const STYLE_PADDING_TOP_REGEX = /padding-top:\s*(\d+(?:\.\d+)?)%/i
const SYNTHETIC_IMAGE_DIMENSION = 1000

function getStyleDimension(style, property) {
  const value = style?.match(STYLE_DIMENSION_REGEX[property])?.[1]
  return value ? Math.round(Number(value)) : null
}

function getStylePaddingTop(style) {
  const value = style?.match(STYLE_PADDING_TOP_REGEX)?.[1]
  return value ? Number(value) : null
}

// Telegram widgets encode image ratios in styles, so this returns synthetic
// dimensions for layout reservation rather than real pixel dimensions.
function inferImageDimensions($, node, fallback = { width: SYNTHETIC_IMAGE_DIMENSION, height: SYNTHETIC_IMAGE_DIMENSION }) {
  const element = $(node)
  const styles = [
    element.attr('style'),
    element.find('.tgme_widget_message_photo').first().attr('style'),
    element.find('i').attr('style'),
    element.parent().attr('style'),
  ]

  let width = null
  let height = null
  let paddingTop = null

  for (const style of styles) {
    if (width === null) {
      width = getStyleDimension(style, 'width')
    }

    if (height === null) {
      height = getStyleDimension(style, 'height')
    }

    if (paddingTop === null) {
      paddingTop = getStylePaddingTop(style)
    }

    if (width && height) {
      return { width, height }
    }
  }

  // Telegram commonly uses wrap width plus child padding-top to express image
  // ratio instead of returning real pixel dimensions.
  if (paddingTop !== null) {
    const syntheticWidth = width ?? fallback.width
    return {
      width: syntheticWidth,
      height: Math.max(1, Math.round(syntheticWidth * paddingTop / 100)),
    }
  }

  return fallback
}

function getImages($, item, { staticProxy, index, title }) {
  const images = $(item).find('.tgme_widget_message_photo_wrap')?.map((_index, photo) => {
    const url = $(photo).attr('style').match(/url\(["'](.*?)["']/)?.[1]
    const imageUrl = staticProxy + url
    const { width, height } = inferImageDimensions($, photo)
    return `
      <a href="${imageUrl}" data-pswp-width="${width}" data-pswp-height="${height}" data-pswp-type="image" class="image-preview-wrap image-loading-placeholder" style="aspect-ratio: ${width} / ${height};">
        <img src="${imageUrl}" alt="${title}" width="${width}" height="${height}" loading="${index > 15 ? 'eager' : 'lazy'}" />
      </a>
    `
  })?.get()
  return images.length ? `<div class="image-list-container ${images.length % 2 === 0 ? 'image-list-even' : 'image-list-odd'}">${images?.join('')}</div>` : ''
}

function getVideo($, item, { staticProxy, index }) {
  const video = $(item).find('.tgme_widget_message_video_wrap video')
  video?.attr('src', staticProxy + video?.attr('src'))
    ?.attr('controls', true)
    ?.attr('preload', index > 15 ? 'auto' : 'metadata')
    ?.attr('playsinline', true)
    .attr('webkit-playsinline', true)

  const roundVideo = $(item).find('.tgme_widget_message_roundvideo_wrap video')
  roundVideo?.attr('src', staticProxy + roundVideo?.attr('src'))
    ?.attr('controls', true)
    ?.attr('preload', index > 15 ? 'auto' : 'metadata')
    ?.attr('playsinline', true)
    .attr('webkit-playsinline', true)
  return $.html(video) + $.html(roundVideo)
}

function getAudio($, item, { staticProxy }) {
  const audio = $(item).find('.tgme_widget_message_voice')
  audio?.attr('src', staticProxy + audio?.attr('src'))
    ?.attr('controls', true)
  return $.html(audio)
}

function normalizeYouTubeVideoId(videoId = '') {
  return /^[\w-]{11}$/.test(videoId) ? videoId : ''
}

function getYouTubeVideoId(urlString = '') {
  try {
    const url = new URL(urlString)
    const hostname = url.hostname.replace(/^www\./, '')

    if (hostname === 'youtu.be') {
      return normalizeYouTubeVideoId(url.pathname.split('/').filter(Boolean)[0])
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

/**
 * Parse Bilibili video ID from URL
 * Supports formats:
 * - www.bilibili.com/video/BVxxxxxx
 * - www.bilibili.com/video/avxxxxxx
 * - b23.tv/xxxxxx (short link)
 * - m.bilibili.com/video/BVxxxxxx
 */
function getBilibiliVideoId(urlString = '') {
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
function removeVideoLinkFromText($, item, isVideoLink) {
  $(item)
    .find('.tgme_widget_message_text a[href]')
    .each((_index, link) => {
      if (isVideoLink($(link).attr('href')))
        $(link).remove()
    })
}

function getLinkPreviewVideo($, item) {
  const urls = [
    $(item).find('.tgme_widget_message_link_preview')?.attr('href'),
    ...($(item).find('.tgme_widget_message_text a[href]')?.map((_index, link) => $(link).attr('href'))?.get() ?? []),
  ].filter(Boolean)

  for (const url of urls) {
    // Check YouTube first
    const youtubeVideoId = getYouTubeVideoId(url)
    if (youtubeVideoId) {
      removeVideoLinkFromText($, item, href => getYouTubeVideoId(href) === youtubeVideoId)
      return {
        videoId: youtubeVideoId,
        html: `<div class="link-preview-video-wrap"><iframe class="link-preview-video" src="https://www.youtube-nocookie.com/embed/${youtubeVideoId}" title="YouTube video player" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`,
      }
    }

    // Check Bilibili
    const bilibiliVideoId = getBilibiliVideoId(url)
    if (bilibiliVideoId) {
      const bilibiliKey = bilibiliVideoId.bvid || bilibiliVideoId.aid
      removeVideoLinkFromText($, item, (href) => {
        const video = getBilibiliVideoId(href)
        return !!video && (video.bvid || video.aid) === bilibiliKey
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

function getLinkPreview($, item, { staticProxy, index }) {
  const link = $(item).find('.tgme_widget_message_link_preview')
  const title = $(item).find('.link_preview_title')?.text() || $(item).find('.link_preview_site_name')?.text()
  const description = $(item).find('.link_preview_description')?.text()

  link?.attr('target', '_blank').attr('rel', 'noopener').attr('title', description)

  const image = $(item).find('.link_preview_image')
  const src = image?.attr('style')?.match(/url\(["'](.*?)["']/i)?.[1]
  const imageSrc = src ? staticProxy + src : ''
  if (imageSrc)
    link?.addClass('image-loading-placeholder')
  image?.replaceWith(`<img class="link_preview_image" alt="${title}" src="${imageSrc}" loading="${index > 15 ? 'eager' : 'lazy'}" />`)
  return $.html(link)
}

function getReply($, item, { channel }) {
  const reply = $(item).find('.tgme_widget_message_reply')
  reply?.wrapInner('<small></small>')?.wrapInner('<blockquote></blockquote>')

  const href = reply?.attr('href')
  if (href) {
    const url = new URL(href)
    reply?.attr('href', `${url.pathname}`.replace(new RegExp(`/${channel}/`, 'i'), '/posts/'))
  }

  return $.html(reply)
}

async function modifyHTMLContent($, content, { index, staticProxy } = {}) {
  await hydrateTgEmoji($, content, { staticProxy })
  $(content).find('.emoji')?.removeAttr('style')
  $(content).find('a')?.each((_index, a) => {
    $(a)?.attr('title', $(a)?.text())?.removeAttr('onclick')
  })
  // Transform Telegram expandable quotes
  $(content).find('blockquote[expandable]')?.each((_index, bq) => {
    const innerHTML = $(bq).html()
    const id = `expand-${index}-${_index}`
    const expandable = `<div class="tg-expandable">
      <input type="checkbox" id="${id}" class="tg-expandable__checkbox">
      <div class="tg-expandable__content">${innerHTML}</div>
      <label for="${id}" class="tg-expandable__toggle" aria-label="Expand/Collapse"></label>
    </div>`
    $(bq).replaceWith(expandable)
  })
  $(content).find('tg-spoiler')?.each((_index, spoiler) => {
    const id = `spoiler-${index}-${_index}`
    $(spoiler)?.attr('id', id)?.wrap('<label class="spoiler-button"></label>')?.before(`<input type="checkbox" />`)
  })
  $(content).find('pre').each((_index, pre) => {
    try {
      $(pre).find('br')?.replaceWith('\n')

      const code = $(pre).text()
      const language = flourite(code, { shiki: true, noUnknown: true })?.language || 'text'
      const highlightedCode = prism.highlight(code, prism.languages[language], language)
      $(pre).html(`<code class="language-${language}">${highlightedCode}</code>`)
    }
    catch (error) {
      console.error(error)
    }
  })
  return content
}

function getReactions($, item, staticProxy) {
  const reactions = []
  const reactionNodes = $(item).find('.tgme_widget_message_reactions .tgme_reaction').toArray()

  for (const reaction of reactionNodes) {
    const isPaid = $(reaction).hasClass('tgme_reaction_paid')
    let emoji = ''
    let emojiId
    let emojiImage

    const standardEmoji = $(reaction).find('.emoji b')
    if (standardEmoji.length) {
      emoji = normalizeEmoji(standardEmoji.text().trim())
    }

    const tgEmoji = $(reaction).find('tg-emoji')
    if (tgEmoji.length && !emoji) {
      emojiId = tgEmoji.attr('emoji-id')
      if (emojiId) {
        const imageUrl = getCustomEmojiImage(emojiId, staticProxy)
        if (imageUrl) {
          emojiImage = imageUrl
        }
      }
    }

    if (isPaid && !emoji && !emojiImage) {
      emoji = '\u2B50'
    }

    const clone = $(reaction).clone()
    clone.find('.emoji, tg-emoji, i').remove()
    const count = clone.text().trim()

    if (count) {
      reactions.push({
        emoji,
        emojiId,
        emojiImage,
        count,
        isPaid,
      })
    }
  }

  return reactions
}

function escapeRegExp(string = '') {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Highlight the search term in the assembled content. Only visible text is
// wrapped — tags and attribute values are left untouched by splitting the HTML
// into tag and text segments. Prism-highlighted code uses entity-encoded angle
// brackets, so it is safe to transform those text segments too.
function highlightSearchTerm(html = '', q = '') {
  if (!q)
    return html

  const pattern = new RegExp(`(${escapeRegExp(q)})`, 'gi')
  return html
    .split(/(<[^>]+>)/)
    .map(segment => (segment.startsWith('<') ? segment : segment.replace(pattern, '<mark class="search-highlight">$1</mark>')))
    .join('')
}

async function getPost($, item, { channel, staticProxy, index = 0, reactionsEnabled, q } = {}) {
  item = item ? $(item).find('.tgme_widget_message') : $('.tgme_widget_message')
  // Decode entity-encoded characters in every URL-bearing attribute before any
  // downstream parsing, so an encoded scheme (e.g. &#106;avascript:) can't slip
  // through into a proxied src/href.
  normalizeUrlAttributes($, $(item))
  const content = $(item).find('.js-message_reply_text')?.length > 0
    ? await modifyHTMLContent($, $(item).find('.tgme_widget_message_text.js-message_text'), { index, staticProxy })
    : await modifyHTMLContent($, $(item).find('.tgme_widget_message_text'), { index, staticProxy })
  const title = content?.text()?.match(/^.*?(?=[。\n]|http\S)/g)?.[0] ?? content?.text() ?? ''
  const id = $(item).attr('data-post')?.replace(new RegExp(`${channel}/`, 'i'), '')

  const tags = $(content).find('a[href^="?q="]')?.each((_index, a) => {
    $(a)?.attr('href', `/search/${encodeURIComponent($(a)?.text())}`)
  })?.map((_index, a) => $(a)?.text()?.replace('#', ''))?.get()

  const linkPreviewVideo = getLinkPreviewVideo($, item)

  return {
    id,
    title,
    type: $(item).attr('class')?.includes('service_message') ? 'service' : 'text',
    datetime: $(item).find('.tgme_widget_message_date time')?.attr('datetime'),
    tags,
    text: content?.text(),
    content: highlightSearchTerm([
      getReply($, item, { channel }),
      getImages($, item, { staticProxy, id, index, title }),
      getVideo($, item, { staticProxy, id, index, title }),
      getAudio($, item, { staticProxy, id, index, title }),
      content?.html(),
      getImageStickers($, item, { staticProxy, index }),
      getVideoStickers($, item, { staticProxy, index }),
      // $(item).find('.tgme_widget_message_sticker_wrap')?.html(),
      $(item).find('.tgme_widget_message_poll')?.html(),
      $.html($(item).find('.tgme_widget_message_document_wrap')),
      $.html($(item).find('.tgme_widget_message_video_player.not_supported')),
      $.html($(item).find('.tgme_widget_message_location_wrap')),
      linkPreviewVideo?.html,
      !linkPreviewVideo && getLinkPreview($, item, { staticProxy, index }),
    ].filter(Boolean).join('').replace(/(url\(["'])((https?:)?\/\/)/g, (_match, p1, p2, _p3) => {
      if (p2 === '//') {
        p2 = 'https://'
      }
      if (p2?.startsWith('t.me')) {
        return false
      }
      return `${p1}${staticProxy}${p2}`
    }), q),
    reactions: reactionsEnabled ? getReactions($, item, staticProxy) : [],
  }
}

export async function getChannelInfo(Astro, { before = '', after = '', q = '', type = 'list', id = '' } = {}) {
  // Where t.me can also be telegram.me, telegram.dog
  const host = getEnv(import.meta.env, Astro, 'TELEGRAM_HOST') ?? 't.me'
  const channel = getEnv(import.meta.env, Astro, 'CHANNEL')
  const staticProxy = getEnv(import.meta.env, Astro, 'STATIC_PROXY') ?? '/static/'
  const reactionsEnabled = getBooleanEnv(import.meta.env, Astro, 'REACTIONS')

  if (!channel)
    throw new Error('CHANNEL environment variable is required')

  const cacheKey = JSON.stringify({ before, after, q, type, id, host, channel, staticProxy, reactionsEnabled })
  const cachedResult = getCachedResult(cacheKey)

  if (cachedResult?.isFresh) {
    console.info('Match Cache', { before, after, q, type, id })
    return cachedResult.data
  }

  const url = id ? `https://${host}/${channel}/${id}?embed=1&mode=tme` : `https://${host}/s/${channel}`
  const headers = getTelegramHeaders(Astro.request.headers)

  console.info('Fetching', url, { before, after, q, type, id })
  let html

  try {
    html = await $fetch(url, {
      headers,
      query: {
        before: before || undefined,
        after: after || undefined,
        q: q || undefined,
      },
      retry: 3,
      retryDelay: 100,
      timeout: TELEGRAM_REQUEST_TIMEOUT,
    })
  }
  catch (error) {
    return serveStaleOrThrow(cachedResult, error, { before, after, q, type, id })
  }

  try {
    const $ = cheerio.load(html, {}, false)
    if (id) {
      const post = await getPost($, null, { channel, staticProxy, reactionsEnabled })
      setCachedResult(cacheKey, post)
      return post
    }
    const parsedPosts = (await Promise.all(
      $('.tgme_channel_history  .tgme_widget_message_wrap')?.map((index, item) => {
        return getPost($, item, { channel, staticProxy, index, reactionsEnabled, q })
      })?.get() ?? [],
    ))?.reverse()
    const posts = parsedPosts.filter(post => ['text'].includes(post.type) && post.id && post.content)
    const latestMessageId = parsedPosts.reduce((latest, post) => {
      const postId = Number(post.id)
      return Number.isSafeInteger(postId) && postId > latest ? postId : latest
    }, 0)

    const channelInfo = {
      posts,
      latestMessageId,
      title: $('.tgme_channel_info_header_title')?.text(),
      description: $('.tgme_channel_info_description')?.text(),
      descriptionHTML: (await modifyHTMLContent($, $('.tgme_channel_info_description'), { staticProxy }))?.html(),
      avatar: normalizeUrlAttribute($('.tgme_page_photo_image img')?.attr('src') ?? ''),
    }

    setCachedResult(cacheKey, channelInfo)
    return channelInfo
  }
  catch (error) {
    return serveStaleOrThrow(cachedResult, error, { before, after, q, type, id })
  }
}

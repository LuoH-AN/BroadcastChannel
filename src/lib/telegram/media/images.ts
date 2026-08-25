import type { CheerioAPI } from 'cheerio'
import type { MessageAssetOptions, MessageSelection } from '../types'
import { escapeHtmlAttribute, getProxiedUrl } from '../url'
import { getImageLoading, inferImageDimensions, STYLE_URL_REGEX } from './utils'

export function getImages($: CheerioAPI, message: MessageSelection, options: MessageAssetOptions): string {
  const { staticProxy = '', index = 0, title = '' } = options
  const fragments: string[] = []
  const loading = getImageLoading(index)
  const safeTitle = escapeHtmlAttribute(title || 'Image from post')

  for (const photoNode of message.find('.tgme_widget_message_photo_wrap').toArray()) {
    const imageUrl = $(photoNode).attr('style')?.match(STYLE_URL_REGEX)?.[1]

    if (!imageUrl) {
      continue
    }

    const proxiedUrl = getProxiedUrl(staticProxy, imageUrl)
    const { width, height } = inferImageDimensions($, photoNode)
    fragments.push(`
      <a
        href="${proxiedUrl}"
        data-pswp-width="${width}"
        data-pswp-height="${height}"
        data-pswp-type="image"
        class="image-preview-wrap image-loading-placeholder"
        style="aspect-ratio: ${width} / ${height};"
        aria-label="Open image preview: ${safeTitle}"
      >
        <img src="${proxiedUrl}" alt="${safeTitle}" width="${width}" height="${height}" loading="${loading}" />
      </a>
    `)
  }

  if (!fragments.length) {
    return ''
  }

  const layoutClass = fragments.length % 2 === 0 ? 'image-list-even' : 'image-list-odd'
  return `<div class="image-list-container ${layoutClass}"><div class="image-grid-sizer"></div>${fragments.join('')}</div>`
}

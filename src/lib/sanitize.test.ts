import { describe, expect, it } from 'vitest'
import { sanitizeContentHtml, sanitizeFeedHtml } from './sanitize'

describe('sanitizeContentHtml', () => {
  it('preserves allowed images, including images with the modal-img class', () => {
    const result = sanitizeContentHtml(`
      <p>
        <img src="ordinary.jpg" alt="Ordinary image" class="photo">
        <img src="modal.jpg" alt="Modal image" class="photo modal-img">
      </p>
    `)

    expect(result).toContain('src="ordinary.jpg"')
    expect(result).toContain('alt="Ordinary image"')
    expect(result).toContain('src="modal.jpg"')
    expect(result).toContain('class="photo modal-img"')
  })

  it('preserves PhotoSwipe anchor attributes for the lightbox', () => {
    const result = sanitizeContentHtml(`
      <a href="photo.jpg" data-pswp-width="1200" data-pswp-height="800" data-pswp-type="image" class="image-preview-wrap">
        <img src="photo.jpg" alt="Photo" width="1200" height="800">
      </a>
    `)

    expect(result).toContain('data-pswp-width="1200"')
    expect(result).toContain('data-pswp-height="800"')
    expect(result).toContain('data-pswp-type="image"')
  })
})

describe('sanitizeFeedHtml', () => {
  it('removes modal images while preserving other allowed content', () => {
    const result = sanitizeFeedHtml(`
      <p>
        <strong>Allowed text</strong>
        <img src="ordinary.jpg" alt="Ordinary image" class="photo">
        <img src="modal.jpg" alt="Modal image" class="photo modal-img">
      </p>
    `)

    expect(result).toContain('<strong>Allowed text</strong>')
    expect(result).toContain('src="ordinary.jpg"')
    expect(result).not.toContain('src="modal.jpg"')
    expect(result).not.toContain('modal-img')
  })
})

describe.each([
  ['sanitizeContentHtml', sanitizeContentHtml],
  ['sanitizeFeedHtml', sanitizeFeedHtml],
])('%s safety', (_name, sanitize) => {
  it('removes scripts and dangerous attributes', () => {
    const result = sanitize(`
      <p onclick="alert('click')">
        <strong>Allowed text</strong>
        <a href="javascript:alert('link')">Link</a>
        <img src="ordinary.jpg" onerror="alert('image')">
        <script>alert('script')</script>
      </p>
    `)

    expect(result).toContain('<strong>Allowed text</strong>')
    expect(result).toContain('src="ordinary.jpg"')
    expect(result).not.toContain('<script')
    expect(result).not.toContain('javascript:')
    expect(result).not.toContain('onclick=')
    expect(result).not.toContain('onerror=')
    expect(result).not.toContain('alert(\'script\')')
  })
})

import type { APIContext } from 'astro'
import type { ChannelInfo } from '../types'
import { load } from 'cheerio'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFeedData } from '../lib/feed'
import { getChannelInfo } from '../lib/telegram'
import { GET as getJson } from './rss.json'
import { GET as getXml } from './rss.xml'
import { GET as getSitemap } from './sitemap.xml'

vi.mock('../lib/telegram', () => ({ getChannelInfo: vi.fn() }))

const channel: ChannelInfo = {
  title: '测试 & Channel',
  description: 'Feed description',
  descriptionHTML: null,
  avatar: undefined,
  posts: [{
    id: '123',
    title: 'Hello & RSS',
    type: 'text',
    datetime: '2026-01-02T03:04:05Z',
    tags: ['中文 & RSS'],
    text: 'Hello',
    content: '<p>Hello</p><script>alert(1)</script>',
    reactions: [],
  }],
}

function context(path: string, accept = '*/*'): APIContext {
  const url = new URL(path, 'https://example.com')
  return {
    url,
    request: new Request(url, { headers: { Accept: accept } }),
    locals: { SITE_URL: 'https://example.com/blog/' },
  } as APIContext
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetAllMocks()
})

describe('feed routes without browser XSLT', () => {
  it.each(['true', 'false'])('keeps RSS XML for browsers and readers when RSS_BEAUTIFY=%s', async (beautify) => {
    vi.stubEnv('RSS_BEAUTIFY', beautify)
    vi.mocked(getChannelInfo).mockResolvedValue(channel)

    for (const accept of ['text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'application/rss+xml']) {
      const response = await getXml(context('/blog/rss.xml', accept))
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('application/rss+xml; charset=utf-8')
      expect(response.headers.get('cache-control')).toBe('public, max-age=3600')
      const xml = await response.text()
      expect(xml).not.toContain('xml-stylesheet')
      const $ = load(xml, { xmlMode: true })
      expect($('rss').attr('version')).toBe('2.0')
      expect($('channel > title').text()).toBe(channel.title)
      expect($('item > title').text()).toBe('Hello & RSS')
      expect($('item > link').text()).toBe('https://example.com/blog/posts/123')
      expect($('item > guid').text()).toBe('https://example.com/blog/posts/123')
      expect($('item > pubDate').text()).toBe('Fri, 02 Jan 2026 03:04:05 GMT')
      expect($('item > content\\:encoded').text()).toBe('<p>Hello</p>')
    }
  })

  it('uses the same tagged data for the preview and feeds, preserving the JSON subscription URL', async () => {
    vi.mocked(getChannelInfo).mockResolvedValue(channel)
    const query = `?tag=${encodeURIComponent('中文 & RSS')}`
    const preview = await getFeedData(context(`/blog/rss${query}`))
    expect(preview.title).toBe('中文 & RSS | 测试 & Channel')
    expect(preview.posts).toEqual(channel.posts)
    expect(preview.tag).toBe('中文 & RSS')

    const xml = load(await (await getXml(context(`/blog/rss.xml${query}`))).text(), { xmlMode: true })
    expect(xml('channel > title').text()).toBe(preview.title)

    const response = await getJson(context(`/blog/rss.json${query}`))
    expect(response.headers.get('content-type')).toBe('application/feed+json; charset=utf-8')
    const feed = await response.json()
    expect(feed.title).toBe(preview.title)
    expect(new URL(feed.feed_url).searchParams.get('tag')).toBe('中文 & RSS')
    expect(feed.items[0].content_html).toBe('<p>Hello</p>')
    expect(vi.mocked(getChannelInfo).mock.calls.every(([options]) => options?.q === '#中文 & RSS')).toBe(true)
  })

  it('serves an empty RSS feed and leaves sitemap URLs unchanged', async () => {
    vi.mocked(getChannelInfo).mockResolvedValue({ ...channel, posts: [] })
    const empty = load(await (await getXml(context('/blog/rss.xml'))).text(), { xmlMode: true })
    expect(empty('item')).toHaveLength(0)
    expect(empty('channel > title').text()).toBe(channel.title)

    vi.mocked(getChannelInfo).mockResolvedValue(channel)
    const sitemap = load(await (await getSitemap(context('/blog/sitemap.xml'))).text(), { xmlMode: true })
    expect(sitemap('sitemapindex').attr('xmlns')).toBe('http://www.sitemaps.org/schemas/sitemap/0.9')
    expect(sitemap('sitemap > loc').first().text()).toBe('https://example.com/blog/sitemap/123.xml')
  })
})

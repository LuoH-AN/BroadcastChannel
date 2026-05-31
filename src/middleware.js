function getSearchQuery(context) {
  const fromQuery = context.url.searchParams.get('q')
  if (fromQuery)
    return fromQuery

  // /search/%23tag style: the query lives in the path segment
  const { pathname } = context.url
  if (pathname.startsWith('/search/')) {
    try {
      return decodeURIComponent(pathname.slice('/search/'.length))
    }
    catch {
      return ''
    }
  }

  return ''
}

export async function onRequest(context, next) {
  context.locals.SITE_URL = `${import.meta.env.SITE ?? ''}${import.meta.env.BASE_URL}`
  context.locals.RSS_URL = `${context.locals.SITE_URL}rss.xml`
  context.locals.RSS_PREFIX = ''

  // On a tag search page, scope the RSS feed (and its title) to that tag
  const searchQuery = getSearchQuery(context)
  if (context.url.pathname.startsWith('/search') && searchQuery.startsWith('#')) {
    const tag = searchQuery.replace('#', '')
    context.locals.RSS_URL = `${context.locals.SITE_URL}rss.xml?tag=${encodeURIComponent(tag)}`
    context.locals.RSS_PREFIX = `${tag} | `
  }

  const response = await next()

  if (!response.bodyUsed) {
    if (response.headers.get('Content-type') === 'text/html') {
      response.headers.set('Speculation-Rules', '"/rules/prefetch.json"')
    }

    if (!response.headers.has('Cache-Control')) {
      response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300')
    }
  }
  return response
};

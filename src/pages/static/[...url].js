const targetWhitelist = [
  't.me',
  'telegram.org',
  'telegram.me',
  'telegram.dog',
  'cdn-telegram.org',
  'telesco.pe',
  'yandex.ru',
]

const requestHeaderAllowlist = [
  'accept',
  'accept-language',
  'if-modified-since',
  'if-none-match',
  'range',
  'user-agent',
]

const responseHeaderAllowlist = [
  'accept-ranges',
  'cache-control',
  'content-disposition',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
  'vary',
]

const MAX_REDIRECTS = 5

function pickHeaders(headers, allowlist) {
  const picked = new Headers()

  for (const name of allowlist) {
    const value = headers.get(name)
    if (value)
      picked.set(name, value)
  }

  return picked
}

export function isAllowedTarget(target) {
  if (target.protocol !== 'https:' || (target.port && target.port !== '443'))
    return false

  const hostname = target.hostname.toLowerCase().replace(/\.$/, '')
  return targetWhitelist.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))
}

async function fetchAllowedTarget(target, headers) {
  let currentTarget = target

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    if (!isAllowedTarget(currentTarget))
      throw new Error('Target is not allowed')

    const response = await fetch(currentTarget, {
      headers,
      redirect: 'manual',
    })

    const location = response.headers.get('location')
    if (response.status < 300 || response.status >= 400 || !location)
      return response

    currentTarget = new URL(location, currentTarget)
  }

  throw new Error('Too many redirects')
}

export async function GET({ request, params, url }) {
  try {
    const rawTarget = `${params.url ?? ''}${url.search}`
    const normalizedTarget = rawTarget.startsWith('//') ? `https:${rawTarget}` : rawTarget
    const target = new URL(normalizedTarget)

    if (!isAllowedTarget(target))
      return new Response('Forbidden', { status: 403 })

    const requestHeaders = pickHeaders(request.headers, requestHeaderAllowlist)
    const response = await fetchAllowedTarget(target, requestHeaders)
    const responseHeaders = pickHeaders(response.headers, responseHeaderAllowlist)

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  }
  catch (error) {
    console.error('Static proxy request failed', error)
    return new Response('Bad Gateway', { status: 502 })
  }
}

// Resolve the real public origin for the current request.
//
// On serverless hosts (Vercel / Netlify / Cloudflare) the request is forwarded
// internally before reaching the app, so Astro.url and request.url report
// `https://localhost`. The actual public host/proto only survive in forwarded
// request headers. We therefore prefer, in order:
//   1. the explicitly configured `SITE` (most reliable across adapters)
//   2. forwarded headers (`x-forwarded-host` / `x-forwarded-proto`)
//   3. the request URL origin as a last resort
export function resolveSiteOrigin(env, requestHeaders, fallback) {
  const site = env.SITE ?? ''
  if (site.startsWith('http'))
    return new URL(site).origin

  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host')
  if (host) {
    const proto = (requestHeaders.get('x-forwarded-proto') || 'https').split(',')[0].trim()
    return `${proto}://${host}`
  }

  return fallback
}

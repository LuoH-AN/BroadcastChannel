export const SITEMAP_PAGE_SIZE = 20

export function getLatestPostId(posts = []) {
  return posts.reduce((latest, post) => {
    const id = Number(post?.id)
    return Number.isSafeInteger(id) && id > latest ? id : latest
  }, 0)
}

export function getSitemapCursors(latestPostId, pageSize = SITEMAP_PAGE_SIZE) {
  if (!Number.isSafeInteger(latestPostId) || latestPostId < 1)
    return []

  const cursors = []
  for (let cursor = latestPostId + 1; cursor > 1; cursor -= pageSize)
    cursors.push(cursor)

  return cursors
}

export function getPostsForSitemapCursor(posts, cursor, pageSize = SITEMAP_PAGE_SIZE) {
  const upperBound = Number(cursor)
  if (!Number.isSafeInteger(upperBound) || upperBound < 2)
    return []

  const lowerBound = Math.max(1, upperBound - pageSize)
  return posts.filter((post) => {
    const id = Number(post?.id)
    return Number.isSafeInteger(id) && id >= lowerBound && id < upperBound
  })
}

export function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;')
}

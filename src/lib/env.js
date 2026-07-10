export function getEnv(env, Astro, name) {
  return env?.[name] ?? Astro.locals?.runtime?.env?.[name]
}

export function getBooleanEnv(env, Astro, name, defaultValue = false) {
  const value = getEnv(env, Astro, name)

  if (value === undefined || value === null || value === '')
    return defaultValue

  if (typeof value === 'boolean')
    return value

  const normalized = String(value).trim().toLowerCase()

  if (['true', '1', 'yes', 'on'].includes(normalized))
    return true

  if (['false', '0', 'no', 'off'].includes(normalized))
    return false

  return defaultValue
}

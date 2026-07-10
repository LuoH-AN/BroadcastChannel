import process from 'node:process'
import vercel from '@astrojs/vercel'
import sentry from '@sentry/astro'
import icon from 'astro-icon'
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel({
    isr: false,
    edgeMiddleware: false,
  }),
  integrations: [
    icon({
      include: {
        ri: ['search-line', 'rss-line', 'mic-line', 'twitter-x-line', 'github-line', 'telegram-line', 'discord-line', 'mastodon-line', 'bluesky-line'],
      },
    }),
    ...(process.env.SENTRY_DSN
      ? [
          sentry({
            enabled: {
              client: false,
              server: process.env.SENTRY_DSN,
            },
            dsn: process.env.SENTRY_DSN,
            sourceMapsUploadOptions: {
              enabled: process.env.SENTRY_PROJECT && process.env.SENTRY_AUTH_TOKEN,
              project: process.env.SENTRY_PROJECT,
              authToken: process.env.SENTRY_AUTH_TOKEN,
            },
          }),
        ]
      : []),
  ],
  vite: {
    server: {
      allowedHosts: ['.run.pinggy-free.link', '.hf.space'],
    },
  },
})

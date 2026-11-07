# Notices

## Bear Blog compatibility

BroadcastChannel independently implements a CSS compatibility interface inspired by [Bear Blog](https://github.com/HermanMartinus/bearblog). Bear Blog source files are not bundled in this repository.

Bear Blog is created by Herman Martinus.

- Project: https://github.com/HermanMartinus/bearblog
- Copyright (c) 2025 Herman Martinus
- License: [Bear Blog License 2.0](https://github.com/HermanMartinus/bearblog/blob/master/LICENSE.md)

## Sepia theme

The optional `public/themes/sepia.css` theme is visually inspired by the [Sepia template](https://github.com/Planetable/SiteTemplateSepia) created by the Planetable Team. It is independently implemented for BroadcastChannel's DOM, and the upstream template's source files are not bundled in this repository.

- Project: https://github.com/Planetable/SiteTemplateSepia
- Copyright (c) 2021-2024 Planetable Development Team
- License: [MIT](https://github.com/Planetable/SiteTemplateSepia/blob/main/LICENSE)

## Terminal theme family

The optional `public/themes/terminal-amber.css`, `terminal-green.css`, `terminal-cyan.css`, and `terminal-magenta.css` themes are visually inspired by [hugo-theme-terminal](https://github.com/panr/hugo-theme-terminal). They are independently implemented for BroadcastChannel's DOM; upstream source files are not bundled in this repository.

- Project: https://github.com/panr/hugo-theme-terminal
- Creator: Radek Kozieł ([@panr](https://github.com/panr))
- README copyright: © 2019-2025 Radek Kozieł
- License notice: Copyright (c) 2024 panr
- License: [MIT](https://github.com/panr/hugo-theme-terminal/blob/master/LICENSE.md)

Terminal loads [Fira Code](https://github.com/tonsky/FiraCode) from Google Fonts at runtime for the monospace face. Fira Code is not vendored in this repository; if the remote stylesheet is unavailable, the theme falls back to system monospace fonts.

- Project: https://github.com/tonsky/FiraCode
- Author: Nikita Prokopov
- License: [OFL-1.1](https://github.com/tonsky/FiraCode/blob/master/LICENSE)

## Aria theme

The optional `public/themes/aria.css` theme is visually inspired by [Aria Template](https://github.com/miantiao-me/astro-aria), an Astro port of `static-templates/aria`. It is independently implemented for BroadcastChannel's DOM; upstream source files are not bundled in this repository.

- Project: https://github.com/miantiao-me/astro-aria
- Author and maintainer: Kai Bi ([ccbikai](https://github.com/ccbikai) / [miantiao-me](https://github.com/miantiao-me))
- License: [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)

## HN News theme

The optional `public/themes/hn-news.css` theme takes visual inspiration from the official [Hacker News](https://news.ycombinator.com/) website. It is an independent implementation for BroadcastChannel's DOM, not an adaptation of Hacker News source material. No Hacker News source code, CSS, fonts, or assets are copied or bundled.

- Visual reference: https://news.ycombinator.com/
- Copyright holder and operator: Y Combinator
- License: N/A — no open-source license applies to the referenced website visual design
- License URL: N/A (not applicable); official legal information: https://www.ycombinator.com/legal/
- Nature: Visual inspiration; independent implementation, not adapted source

## TG Channel theme

The optional `public/themes/tg-channel.css` theme takes visual inspiration from Telegram's public channel preview, using [Broadcast Channel Blog](https://t.me/s/Broadcast_Channel_Blog) as the reference instance. It is an independent implementation for BroadcastChannel's DOM, not an adaptation of Telegram source material. No Telegram source code, CSS, fonts, or assets are copied or bundled.

- Visual reference: https://t.me/s/Broadcast_Channel_Blog
- Official public preview base: https://t.me/s/
- Copyright holder: Telegram Messenger Inc.
- License: N/A — no open-source license applies to the referenced public preview visual design
- License URL: N/A (not applicable); official terms: https://telegram.org/tos
- Nature: Visual inspiration; independent implementation, not adapted source

## ZAE theme

The optional `public/themes/zae.css` theme takes visual inspiration from Zed's official [Agentic Engineering](https://zed.dev/agentic-engineering) page. It is an independent implementation for BroadcastChannel's DOM, not an adaptation of Zed source material. No Zed source code, CSS, fonts, or assets are copied or bundled.

- Visual reference: https://zed.dev/agentic-engineering
- Copyright holder: Zed Industries, Inc.
- License: N/A — no open-source license applies to the referenced website visual design
- License URL: N/A (not applicable); official reference page: https://zed.dev/agentic-engineering
- Nature: Visual inspiration; independent implementation, not adapted source

## LuoH theme fonts

The custom `public/themes/luoh.css` theme uses **MiSans by Xiaomi** for body text and interface controls. MiSans is loaded from Xiaomi's official font service at runtime; its font files are not copied, modified, or bundled in this repository.

- Project and copyright holder: [MiSans](https://hyperos.mi.com/font/zh/), Xiaomi Inc. (小米科技有限责任公司)
- License: [MiSans Font Intellectual Property License Agreement](https://hyperos.mi.com/font-download/MiSans%E5%AD%97%E4%BD%93%E7%9F%A5%E8%AF%86%E4%BA%A7%E6%9D%83%E8%AE%B8%E5%8F%AF%E5%8D%8F%E8%AE%AE.pdf)
- Nature: Runtime use of the official webfont service, with this explicit MiSans attribution

The companion fonts are also loaded remotely at runtime and are not bundled:

| Font | Use | Author or copyright holder | License |
| --- | --- | --- | --- |
| [Cormorant Garamond](https://github.com/CatharsisFonts/Cormorant) | Latin headings | Christian Thalmann / Cormorant Project Authors, copyright 2015 | [SIL OFL 1.1](https://github.com/google/fonts/blob/main/ofl/cormorantgaramond/OFL.txt) |
| [LXGW WenKai](https://github.com/lxgw/LxgwWenKai) | Chinese headings and quotations | LXGW; Klee Project Authors | [SIL OFL 1.1](https://github.com/lxgw/LxgwWenKai/blob/main/OFL.txt) |
| [IBM Plex Mono](https://github.com/IBM/plex) | Code | IBM Corp., copyright 2017 | [SIL OFL 1.1](https://github.com/IBM/plex/blob/master/LICENSE.txt) |

LXGW WenKai webfont delivery uses the versioned [`lxgw-wenkai-webfont`](https://github.com/chawyehsu/lxgw-wenkai-webfont) package by D.H. (Chawye Hsu). Its packaging code is [MIT-licensed](https://github.com/chawyehsu/lxgw-wenkai-webfont/blob/main/LICENSE); the fonts retain their SIL OFL license. Cormorant Garamond and IBM Plex Mono are delivered through Google Fonts.

These are attribution and compatibility notices only. They do not imply endorsement by or official affiliation with Bear Blog, Planetable, hugo-theme-terminal, Aria Template, Y Combinator or Hacker News, Telegram Messenger Inc., Zed Industries, Inc., or the font creators, and they do not change the licensing of BroadcastChannel under the root `LICENSE`.

<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <xsl:variable name="title">
      <xsl:value-of select="/rss/channel/title"/>
    </xsl:variable>
    <xsl:variable name="description">
      <xsl:value-of select="/rss/channel/description"/>
    </xsl:variable>
    <xsl:variable name="link">
      <xsl:value-of select="/rss/channel/link"/>
    </xsl:variable>
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="theme-color" content="#f4f1ec"/>
        <link href="https://fonts.googleapis.cn/css2?family=Noto+Serif+SC:wght@200..900&amp;family=Sen:wght@400..800&amp;display=swap" rel="stylesheet"/>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js"></script>
        <title><xsl:value-of select="$title"/> - RSS Feed</title>
        <style>
          :root {
            --background-color: #f4f1ec;
            --foreground-color: #000000;
            --highlight-color: orangered;
            --box-border-radius: 12px;
            --dot-size: 8px;
            --box-margin: 12px;
            --border-color: rgba(0, 0, 0, 0.08);
            --link-color: var(--highlight-color);
            --secondary-color: #999;
            --cell-background-color: #fff;
          }

          *,
          *::before,
          *::after {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Sen', 'Noto Serif SC', ui-sans-serif, system-ui, sans-serif;
            background-color: var(--background-color);
            color: var(--foreground-color);
            line-height: 1.6;
            padding: 20px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          #wrapper {
            margin-left: 20px;
            margin-right: 20px;
            margin-top: 0;
            margin-bottom: 0;
          }

          #container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
          }

          #main-container {
            padding-top: 20px;
            padding-right: 30px;
            padding-bottom: 20px;
            margin-right: 20px;
          }

          .items {
            margin-top: 20px;
            margin-left: 28px;
          }

          .item {
            margin-bottom: 0;
          }

          .time-box {
            padding: 0;
            line-height: 1;
            display: flex;
            align-items: center;
          }

          .time-box .dot {
            width: var(--dot-size);
            height: var(--dot-size);
            border-radius: var(--dot-size);
            background-color: var(--link-color);
          }

          .time-box .time {
            flex: 1;
            color: var(--link-color);
            font-size: 12px;
            font-weight: 500;
            padding-left: 10px;
          }

          .time-box a {
            color: var(--link-color);
            text-decoration: none;
          }

          .time-box a:hover {
            text-decoration: underline;
          }

          .text-box {
            border-left: 2px solid var(--border-color);
            padding: 30px 0 30px 30px;
            font-size: 14px;
            line-height: 1.6;
            margin-left: 3px;
            word-break: break-word;
          }

          .text-box p:first-child {
            margin-top: 0;
          }

          .text-box p:last-child {
            margin-bottom: 0;
          }

          .text-box img {
            max-width: 100%;
            height: auto;
            border-radius: var(--box-border-radius);
            margin: 10px 0;
          }

          a:link,
          a:visited {
            color: #778087;
            text-decoration: none;
            line-break: loose;
          }

          a:hover {
            color: #4d5256;
            text-decoration: underline;
            text-underline-offset: 0.2rem;
          }

          .item-link:link,
          .item-link:visited {
            color: var(--link-color);
            text-decoration: none;
          }

          .item-link:hover {
            text-decoration: underline;
          }

          .site-title:link,
          .site-title:visited {
            color: #333;
            text-decoration: none;
          }

          .site-title:hover {
            color: #000;
            text-decoration: underline;
          }

          .no-posts {
            text-align: center;
            padding: 60px 20px;
            color: var(--secondary-color);
            font-size: 1em;
          }

          @media screen and (max-width: 600px) {
            body {
              padding: 10px;
            }
            #wrapper {
              margin-left: 10px;
              margin-right: 10px;
            }
            #main-container {
              padding-right: 0;
              margin-right: 0;
              padding-top: 10px;
            }
            .items {
              margin-left: 0;
            }
          }
        </style>
      </head>
      <body>
        <script>
          <![CDATA[
          function formatRSSDate(dateString) {
            if (!dateString) return '';
            if (typeof dayjs === 'undefined') {
              return dateString;
            }

            const date = dayjs(dateString);
            if (!date.isValid()) return dateString;

            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

            const hours = String(date.hour()).padStart(2, '0');
            const minutes = String(date.minute()).padStart(2, '0');
            const month = months[date.month()];
            const day = date.date();
            const year = date.year();
            const dayOfWeek = days[date.day()];

            return hours + ':' + minutes + ' · ' + month + ' ' + day + ', ' + year + ' · ' + dayOfWeek;
          }

          window.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('time[data-rss-date]').forEach(function(timeEl) {
              const dateStr = timeEl.getAttribute('data-rss-date');
              if (dateStr) {
                timeEl.textContent = formatRSSDate(dateStr);
              }
            });
          });
          ]]>
        </script>
        <div id="wrapper">
          <div id="container">
            <div id="main-container">
              <div class="items">
                <xsl:choose>
                  <xsl:when test="/rss/channel/item">
                    <xsl:for-each select="/rss/channel/item">
                      <div class="item">
                        <div class="time-box">
                          <div class="dot"></div>
                          <div class="time">
                            <xsl:choose>
                              <xsl:when test="link">
                                <a href="{link}" class="item-link" target="_blank" rel="noopener">
                                  <time data-rss-date="{pubDate}"></time>
                                </a>
                              </xsl:when>
                              <xsl:otherwise>
                                <time data-rss-date="{pubDate}"></time>
                              </xsl:otherwise>
                            </xsl:choose>
                          </div>
                        </div>
                        <xsl:if test="description or content:encoded">
                          <div class="text-box">
                            <xsl:if test="content:encoded">
                              <div>
                                <xsl:value-of select="content:encoded" disable-output-escaping="yes"/>
                              </div>
                            </xsl:if>
                            <xsl:if test="description">
                              <div>
                                <xsl:value-of select="description" disable-output-escaping="yes"/>
                              </div>
                            </xsl:if>
                          </div>
                        </xsl:if>
                      </div>
                    </xsl:for-each>
                  </xsl:when>
                  <xsl:when test="/atom:feed/atom:entry">
                    <xsl:for-each select="/atom:feed/atom:entry">
                      <div class="item">
                        <div class="time-box">
                          <div class="dot"></div>
                          <div class="time">
                            <xsl:choose>
                              <xsl:when test="atom:link/@href">
                                <a href="{atom:link/@href}" class="item-link" target="_blank" rel="noopener">
                                  <time data-rss-date="{atom:updated}"></time>
                                </a>
                              </xsl:when>
                              <xsl:otherwise>
                                <time data-rss-date="{atom:updated}"></time>
                              </xsl:otherwise>
                            </xsl:choose>
                          </div>
                        </div>
                        <xsl:if test="atom:summary or atom:content or atom:title">
                          <div class="text-box">
                            <xsl:if test="atom:title">
                              <h2 style="font-size: 1.05em; margin-bottom: 0.5em; font-weight: 600;">
                                <xsl:choose>
                                  <xsl:when test="atom:link/@href">
                                    <a href="{atom:link/@href}" class="site-title" target="_blank" rel="noopener">
                                      <xsl:value-of select="atom:title"/>
                                    </a>
                                  </xsl:when>
                                  <xsl:otherwise>
                                    <xsl:value-of select="atom:title"/>
                                  </xsl:otherwise>
                                </xsl:choose>
                              </h2>
                            </xsl:if>
                            <xsl:if test="atom:summary">
                              <div>
                                <xsl:value-of select="atom:summary" disable-output-escaping="yes"/>
                              </div>
                            </xsl:if>
                            <xsl:if test="atom:content">
                              <div>
                                <xsl:value-of select="atom:content" disable-output-escaping="yes"/>
                              </div>
                            </xsl:if>
                          </div>
                        </xsl:if>
                      </div>
                    </xsl:for-each>
                  </xsl:when>
                  <xsl:otherwise>
                    <div class="no-posts">No posts available</div>
                  </xsl:otherwise>
                </xsl:choose>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>

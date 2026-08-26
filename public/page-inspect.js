/* Page Inspector — opt-in element identification helper.
   Activates ONLY when the URL contains ?inspect (e.g. /posts/85?inspect).
   Normal visitors never execute any of this: the early return below is the
   first statement. Used to point at UI spots remotely and copy a stable
   selector back to chat. */
;(function () {
  'use strict'

  var params = new URLSearchParams(location.search)
  if (!params.has('inspect')) {
    return
  }

  var PANEL_ID = 'inspect-panel'
  var BANNER_ID = 'inspect-banner'
  var highlighted = null

  function el(tag, attrs, text) {
    var node = document.createElement(tag)
    Object.keys(attrs || {}).forEach(function (k) {
      node.setAttribute(k, attrs[k])
    })
    if (text != null) {
      node.textContent = text
    }
    return node
  }

  /* Shortest readable path: the element itself plus up to two ancestors,
     preferring class names over positional selectors. */
  function describe(el) {
    var out = { tag: '', classes: [], id: '', path: '', font: '' }
    if (!el || el.nodeType !== 1) {
      return out
    }
    out.tag = el.tagName.toLowerCase()
    out.classes = Array.prototype.slice.call(el.classList)
    out.id = el.id || ''
    var chain = []
    var cur = el
    while (cur && cur !== document.body && chain.length < 3) {
      var seg = cur.tagName.toLowerCase()
      if (cur.id) {
        seg += '#' + cur.id
        chain.unshift(seg)
        break
      }
      var cls = Array.prototype.slice.call(cur.classList).slice(0, 3)
      if (cls.length) {
        seg += '.' + cls.join('.')
      }
      chain.unshift(seg)
      cur = cur.parentElement
    }
    out.path = chain.join(' > ')
    try {
      var ff = getComputedStyle(el).fontFamily || ''
      out.font = ff.split(',')[0].replace(/["']/g, '').trim()
    } catch (e) {
      out.font = ''
    }
    return out
  }

  function renderPanel(info) {
    var panel = document.getElementById(PANEL_ID)
    if (!panel) {
      return
    }
    panel.innerHTML = ''

    var title = el('div', { class: 'ip-row ip-title' }, info.tag + (info.id ? '#' + info.id : '') + (info.classes.length ? '.' + info.classes.join('.') : ''))
    panel.appendChild(title)

    if (info.path && info.path !== title.textContent) {
      panel.appendChild(el('div', { class: 'ip-row' }, info.path))
    }
    if (info.font) {
      panel.appendChild(el('div', { class: 'ip-row ip-dim' }, 'font: ' + info.font))
    }

    var actions = el('div', { class: 'ip-actions' })
    var copyBtn = el('button', { class: 'ip-btn ip-primary', type: 'button' }, '复制选择器')
    copyBtn.addEventListener('click', function (ev) {
      ev.stopPropagation()
      var text = info.path || title.textContent
      var done = function () {
        copyBtn.textContent = '已复制 ✓'
        setTimeout(function () {
          copyBtn.textContent = '复制选择器'
        }, 1200)
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done)
      } else {
        var ta = el('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        try {
          document.execCommand('copy')
        } catch (e) {}
        ta.remove()
        done()
      }
    })
    actions.appendChild(copyBtn)

    var closeBtn = el('button', { class: 'ip-btn', type: 'button' }, '退出检查')
    closeBtn.addEventListener('click', function (ev) {
      ev.stopPropagation()
      teardown()
    })
    actions.appendChild(closeBtn)
    panel.appendChild(actions)

    panel.classList.add('ip-visible')
  }

  function clearHighlight() {
    if (highlighted) {
      highlighted.style.outline = highlighted.dataset.ipPrevOutline || ''
      delete highlighted.dataset.ipPrevOutline
      highlighted = null
    }
  }

  function onCaptureClick(ev) {
    var target = ev.target
    if (target.closest('#' + PANEL_ID + ', #' + BANNER_ID)) {
      return
    }
    ev.preventDefault()
    ev.stopPropagation()

    clearHighlight()
    var prev = target.style.outline
    target.dataset.ipPrevOutline = prev
    target.style.outline = '2px solid #ff4500'
    highlighted = target

    renderPanel(describe(target))
  }

  function teardown() {
    document.removeEventListener('click', onCaptureClick, true)
    clearHighlight()
    var panel = document.getElementById(PANEL_ID)
    var banner = document.getElementById(BANNER_ID)
    if (panel) {
      panel.remove()
    }
    if (banner) {
      banner.remove()
    }
  }

  function init() {
    var style = el('style')
    style.textContent =
      '#' + BANNER_ID + '{position:fixed;top:0;left:0;right:0;z-index:2147483646;background:#111;color:#fff;font:13px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;gap:8px}' +
      '#' + BANNER_ID + ' span{flex:1}' +
      '#' + BANNER_ID + ' button{background:none;border:1px solid #555;color:#fff;border-radius:6px;padding:4px 10px;font-size:12px}' +
      '#' + PANEL_ID + '{position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483647;background:#111;color:#eee;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;padding:10px 12px;border-radius:10px;display:none;box-shadow:0 4px 16px rgba(0,0,0,.35)}' +
      '#' + PANEL_ID + '.ip-visible{display:block}' +
      '#' + PANEL_ID + ' .ip-title{color:#ffb347;font-weight:600;margin-bottom:2px}' +
      '#' + PANEL_ID + ' .ip-row{word-break:break-all}' +
      '#' + PANEL_ID + ' .ip-dim{color:#999}' +
      '#' + PANEL_ID + ' .ip-actions{display:flex;gap:8px;margin-top:8px}' +
      '#' + PANEL_ID + ' .ip-btn{flex:1;border:1px solid #444;background:#222;color:#eee;border-radius:8px;padding:8px 0;font-size:13px;font-family:inherit}' +
      '#' + PANEL_ID + ' .ip-primary{background:#ff4500;border-color:#ff4500;color:#fff}'
    document.head.appendChild(style)

    var banner = el('div', { id: BANNER_ID })
    banner.appendChild(el('span', null, '🔍 检查模式：点按页面上的任意元素'))
    var exitBtn = el('button', { type: 'button' }, '退出')
    exitBtn.addEventListener('click', teardown)
    banner.appendChild(exitBtn)
    document.body.appendChild(banner)

    var panel = el('div', { id: PANEL_ID })
    document.body.appendChild(panel)

    /* Capture phase: ours runs before page/Twikoo handlers. */
    document.addEventListener('click', onCaptureClick, true)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()

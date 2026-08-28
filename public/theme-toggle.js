/* LuoH theme toggle: three states (auto / light / dark) stored in localStorage.
   The palette lives in themes/luoh.css; this script only maintains the
   html[data-luoh-theme] attribute and injects the toggle button into the
   header .social-links row (right after the search icon), so no src/ changes
   are needed. Load it from HEADER_INJECT without defer:

     <script src="/theme-toggle.js"></script>

   Loading it blocking in <head> avoids a flash when the saved preference
   disagrees with prefers-color-scheme. */
(function () {
  const STORE_KEY = 'luoh-theme'
  const ROOT_ATTR = 'data-luoh-theme'

  const saved = localStorage.getItem(STORE_KEY)
  const pref = saved === 'light' || saved === 'dark' ? saved : 'auto'
  document.documentElement.setAttribute(ROOT_ATTR, pref)

  function makeButton() {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'luoh-theme-toggle'
    btn.title = 'Theme: ' + pref
    btn.setAttribute('aria-label', 'Theme: ' + pref)
    /* Glyphs match the search icon's stroke style (20x20, currentColor, 1.8).
       Only the one matching the current state is shown — see luoh.css. */
    btn.innerHTML =
      '<svg class="icon-sun" viewBox="0 0 20 20" fill="none" aria-hidden="true">'
      + '<circle cx="10" cy="10" r="4" stroke="currentColor" stroke-width="1.8"></circle>'
      + '<path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M3.4 3.4l1.4 1.4M15.2 15.2l1.4 1.4M16.6 3.4l-1.4 1.4M4.8 15.2l-1.4 1.4" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"></path>'
      + '</svg>'
      + '<svg class="icon-moon" viewBox="0 0 20 20" fill="none" aria-hidden="true">'
      + '<path d="M15.5 12.5a6.3 6.3 0 0 1-8-8 6.3 6.3 0 1 0 8 8Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"></path>'
      + '</svg>'
      + '<svg class="icon-auto" viewBox="0 0 20 20" fill="none" aria-hidden="true">'
      + '<circle cx="10" cy="10" r="6.3" stroke="currentColor" stroke-width="1.8"></circle>'
      + '<path d="M10 3.7a6.3 6.3 0 0 1 0 12.6Z" fill="currentColor"></path>'
      + '</svg>'
    return btn
  }

  function mount() {
    const row = document.querySelector('.social-links')
    if (!row || row.querySelector('.luoh-theme-toggle')) return
    const search = row.querySelector('.search')
    const btn = makeButton()
    if (search && search.nextSibling) {
      row.insertBefore(btn, search.nextSibling)
    } else if (search) {
      row.appendChild(btn)
    } else {
      row.appendChild(btn)
    }
  }

  document.addEventListener('DOMContentLoaded', mount)

  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.luoh-theme-toggle')
    if (!btn) return
    const cycle = { auto: 'light', light: 'dark', dark: 'auto' }
    const cur = document.documentElement.getAttribute(ROOT_ATTR) || 'auto'
    const next = cycle[cur] || 'auto'
    document.documentElement.setAttribute(ROOT_ATTR, next)
    localStorage.setItem(STORE_KEY, next)
    btn.title = 'Theme: ' + next
    btn.setAttribute('aria-label', 'Theme: ' + next)
  })
})()

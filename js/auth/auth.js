/* ==========================================================================
   MaintainIQ - Shared Auth Module (session, UI, protectRoute, toasts)
   Depends on: <script src=".../@supabase/supabase-js@2"> loaded globally.
   Load this on EVERY page — it auto-inits and updates the navbar.
   ========================================================================== */

import { PROJECT_URL, PUBLISH_KEY } from '../config/config.js'

const { createClient } = window.supabase
export const supabase = createClient(PROJECT_URL, PUBLISH_KEY)

const USER_CACHE_KEY = 'maintainiq-user'

/* ── Admin check ───────────────────────────────────────────────────────── */

export function isAdmin(user) {
  return user?.email === 'admin@admin.com'
}

/* ── Toast notifications ──────────────────────────────────────────────── */

export function showToast(message, type = 'info', duration = 3500) {
  let container = document.querySelector('.toast-container')
  if (!container) {
    container = document.createElement('div')
    container.className = 'toast-container'
    document.body.appendChild(container)
  }

  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.textContent = message

  container.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateX(100px)'
    toast.style.transition = 'all 0.3s ease'
    setTimeout(() => toast.remove(), 300)
  }, duration)
}

/* ── Role-based redirect after login/signup ────────────────────────────── */

export function redirectAfterAuth(user) {
  if (isAdmin(user)) {
    window.location.href = '/pages/private/admin/index.html'
  } else {
    window.location.href = '/'
  }
}

/* ── Sign out (Supabase docs pattern) ──────────────────────────────────── */

/**
 * Clears ALL Supabase-related items from localStorage.
 * Supabase stores the session under keys prefixed with "sb-".
 */
function clearSupabaseStorage() {
  const toRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('sb-')) {
      toRemove.push(key)
    }
  }
  toRemove.forEach(key => localStorage.removeItem(key))
}

/**
 * Sign out the current user following the Supabase docs pattern:
 *   const { error } = await supabase.auth.signOut()
 *
 * 1. Clear all Supabase session data from localStorage first
 * 2. Call supabase.auth.signOut() to revoke the session server-side
 * 3. Clear the custom user cache
 * 4. Redirect to home
 *
 * Using try/catch so the user is always logged out locally even if the
 * network request to revoke the token fails.
 */
export async function signOutUser() {
  // 1. Nuke all Supabase localStorage keys first (sb- prefix)
  clearSupabaseStorage()

  // 2. Call signOut per Supabase docs — revokes session on the server
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.warn('Supabase signOut API error (session still cleared locally):', error.message)
    }
  } catch (err) {
    // Network errors etc. — don't block logout, session is already cleared locally
    console.warn('Supabase signOut network error (session still cleared locally):', err)
  }

  // 3. Remove our own cache
  localStorage.removeItem(USER_CACHE_KEY)

  // 4. Go home
  window.location.href = '/'
}

/* ── Auto-init on every page ─────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession()
  syncUserCache(session?.user ?? null)

  updateMainNavbar(session?.user ?? null)
  updateAdminTopbar(session?.user ?? null)
  updateMobileDrawer(session?.user ?? null)
  updateAssetsPageBtn(session?.user ?? null)
})

/* ── localStorage cache ──────────────────────────────────────────────── */

function syncUserCache(user) {
  if (user) {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    }))
  } else {
    localStorage.removeItem(USER_CACHE_KEY)
  }
}

export function getCachedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_CACHE_KEY))
  } catch {
    return null
  }
}

/* ── Main site navbar (landing page) ──────────────────────────────────── */

function updateMainNavbar(user) {
  const navActions = document.querySelector('.nav-actions')
  if (!navActions) return

  const old = navActions.querySelector('.user-menu')
  if (old) old.remove()

  const signInBtn = document.getElementById('btn-signin')
  const getStartedBtn = document.getElementById('btn-getstarted-nav')

  if (user) {
    if (signInBtn) signInBtn.style.display = 'none'
    if (getStartedBtn) getStartedBtn.style.display = 'none'
    navActions.insertBefore(
      buildUserMenu(user, false),
      navActions.querySelector('.theme-toggle')?.nextSibling ?? null,
    )
  } else {
    if (signInBtn) signInBtn.style.display = ''
    if (getStartedBtn) getStartedBtn.style.display = ''
  }
}

/* ── Admin topbar ─────────────────────────────────────────────────────── */

function updateAdminTopbar(user) {
  const topbarActions = document.querySelector('.topbar-actions')
  if (!topbarActions) return

  const old = topbarActions.querySelector('.user-menu')
  if (old) old.remove()

  const hardcoded = topbarActions.querySelector('.admin-avatar')
  if (hardcoded) hardcoded.remove()

  if (user) {
    topbarActions.appendChild(buildUserMenu(user, true))
  }
}

/* ── Public assets page nav-actions ───────────────────────────────────── */

function updateAssetsPageBtn(user) {
  const container = document.querySelector('.nav-actions')
  if (!container) return
  const backBtn = container.querySelector('a[href*="index.html"].btn-emerald')
  if (!backBtn) return

  const old = container.querySelector('.user-menu')
  if (old) old.remove()

  if (user) {
    backBtn.style.display = 'none'
    container.insertBefore(buildUserMenu(user, false), backBtn.nextSibling ?? null)
  } else {
    backBtn.style.display = ''
  }
}

/* ── Mobile drawer ────────────────────────────────────────────────────── */

function updateMobileDrawer(user) {
  const drawerActions = document.querySelector('.mobile-drawer-actions')
  if (!drawerActions) return

  const old = drawerActions.querySelector('.user-menu-mobile')
  if (old) old.remove()

  const signInDrawer = document.getElementById('btn-signin-drawer')
  const getStartedDrawer = document.getElementById('btn-getstarted-drawer')

  if (user) {
    if (signInDrawer) signInDrawer.style.display = 'none'
    if (getStartedDrawer) getStartedDrawer.style.display = 'none'

    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    const el = document.createElement('div')
    el.className = 'user-menu-mobile'
    el.innerHTML = `
      <div class="mobile-user-info">
        <span class="mobile-user-avatar">${initials}</span>
        <div>
          <div class="mobile-user-name">${name}</div>
          <div class="mobile-user-email">${user.email || ''}</div>
        </div>
      </div>
      ${isAdmin(user)
        ? '<a href="/pages/private/admin/index.html" class="btn btn-secondary mobile-drawer-link" style="width:100%;text-align:center;">Dashboard</a>'
        : ''}
      <button class="btn btn-secondary mobile-logout-btn" style="width:100%;text-align:center;color:#ef4444;">Sign Out</button>
    `
    drawerActions.insertBefore(el, drawerActions.firstChild)

    el.querySelector('.mobile-logout-btn').addEventListener('click', (e) => {
      e.preventDefault()
      signOutUser()
    })
  } else {
    if (signInDrawer) signInDrawer.style.display = ''
    if (getStartedDrawer) getStartedDrawer.style.display = ''
  }
}

/* ── User menu dropdown builder ───────────────────────────────────────── */

function buildUserMenu(user, isCompact) {
  const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const email = user.email || ''
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const menu = document.createElement('div')
  menu.className = 'user-menu'
  menu.innerHTML = `
    <button class="user-menu-trigger">
      <span class="user-avatar">${initials}</span>
      ${isCompact ? '' : `<span class="user-name">${name}</span>`}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
    <div class="user-dropdown" hidden>
      <div class="user-dropdown-header">${email}</div>
      ${isAdmin(user)
        ? '<a href="/pages/private/admin/index.html" class="user-dropdown-item">Dashboard</a>'
        : ''}
      <button class="user-dropdown-item logout-btn">Sign Out</button>
    </div>
  `

  const trigger = menu.querySelector('.user-menu-trigger')
  const dropdown = menu.querySelector('.user-dropdown')

  trigger.addEventListener('click', (e) => {
    e.stopPropagation()
    dropdown.hidden = !dropdown.hidden
  })

  document.addEventListener('click', () => { dropdown.hidden = true }, { once: false })

  menu.querySelector('.logout-btn').addEventListener('click', (e) => {
    e.stopPropagation()
    signOutUser()
  })

  return menu
}

/* ── Route protection ─────────────────────────────────────────────────── */

/** Redirect to login if no session. */
export async function protectRoute() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    window.location.href = '/pages/auth/login.html'
    return false
  }
  return true
}

/** Require both session AND admin@admin.com — otherwise redirect. */
export async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    window.location.href = '/pages/auth/login.html'
    return false
  }
  if (!isAdmin(session.user)) {
    window.location.href = '/'
    showToast('Access denied. Admins only.', 'error')
    return false
  }
  return true
}

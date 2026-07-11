/* ==========================================================================
   MaintainIQ - Technician Dashboard Script
   ========================================================================== */

import { showToast } from '../../auth/auth.js'

const TECH_SESSION_KEY = 'maintainiq-tech-session'

document.addEventListener('DOMContentLoaded', () => {
  // Check session
  const raw = localStorage.getItem(TECH_SESSION_KEY)
  if (!raw) {
    window.location.href = '/pages/auth/login.html'
    return
  }

  let tech
  try {
    tech = JSON.parse(raw)
  } catch {
    localStorage.removeItem(TECH_SESSION_KEY)
    window.location.href = '/pages/auth/login.html'
    return
  }

  // Greet
  const nameEl = document.getElementById('tech-name')
  if (nameEl) nameEl.textContent = tech.name || tech.email || 'Technician'

  // Init
  initSidebarNavigation()
  initSidebarToggle()
  initLogout()
})

/* --- Sidebar Navigation --- */

function initSidebarNavigation() {
  const links = document.querySelectorAll('.tech-sidebar-link[data-page]')
  const pages = document.querySelectorAll('.tech-page')
  const pageTitle = document.getElementById('tech-page-title')

  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault()

      links.forEach(l => l.classList.remove('active'))
      link.classList.add('active')

      const pageId = link.dataset.page
      pages.forEach(p => p.classList.remove('active'))

      const target = document.getElementById(`tech-page-${pageId}`)
      if (target) {
        target.classList.add('active')
        if (pageTitle) pageTitle.textContent = link.querySelector('span').textContent
      }

      // Close sidebar on mobile
      const sidebar = document.getElementById('tech-sidebar')
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open')
      }
    })
  })
}

/* --- Sidebar Toggle (mobile) --- */

function initSidebarToggle() {
  const toggleBtn = document.getElementById('tech-mobile-toggle')
  const sidebar = document.getElementById('tech-sidebar')

  if (!toggleBtn || !sidebar) return

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open')
  })

  document.addEventListener('click', e => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove('open')
      }
    }
  })
}

/* --- Logout --- */

function initLogout() {
  const logoutBtn = document.getElementById('tech-logout-btn')
  if (!logoutBtn) return

  logoutBtn.addEventListener('click', e => {
    e.preventDefault()
    localStorage.removeItem(TECH_SESSION_KEY)
    showToast('Logged out successfully.', 'success')
    setTimeout(() => {
      window.location.href = '/'
    }, 200)
  })
}

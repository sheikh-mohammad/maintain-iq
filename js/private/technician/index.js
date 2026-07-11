/* ==========================================================================
   MaintainIQ - Technician Dashboard Script
   ========================================================================== */

const TECH_SESSION_KEY = 'maintainiq-tech-session'

document.addEventListener('DOMContentLoaded', () => {
  // Check for manual tech session in localStorage
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

  // Greet the technician
  const nameEl = document.getElementById('tech-name')
  if (nameEl) nameEl.textContent = tech.name || tech.email || 'Technician'
})

/* ==========================================================================
   MaintainIQ - Login Page Handler
   ========================================================================== */

import { supabase, showToast } from './auth.js'

const TECH_SESSION_KEY = 'maintainiq-tech-session'

document.addEventListener('DOMContentLoaded', () => {
  // Already logged in via Supabase Auth?
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session) {
      window.location.href = '/'
      return
    }
  })

  // Already logged in via tech session?
  const techSession = localStorage.getItem(TECH_SESSION_KEY)
  if (techSession) {
    try {
      const s = JSON.parse(techSession)
      if (s.email) window.location.href = '/pages/private/technician/index.html'
    } catch { /* ignore */ }
  }

  initLoginForm()
})

function initLoginForm() {
  const form = document.getElementById('login-form')
  if (!form) return
  form.addEventListener('submit', handleLogin)
}

async function handleLogin(e) {
  e.preventDefault()

  const form = e.currentTarget
  const email = form.querySelector('#login-email').value.trim()
  const password = form.querySelector('#login-password').value
  const submitBtn = form.querySelector('.auth-submit')

  if (!email || !password) {
    showToast('Please fill in all fields.', 'error')
    return
  }

  const originalText = submitBtn.textContent
  submitBtn.textContent = 'Signing In...'
  submitBtn.disabled = true

  try {
    // 1. First check: technician login (email + password in technicians table)
    const { data: tech } = await supabase
      .from('technicians')
      .select('email, full_name, specialty')
      .eq('email', email)
      .eq('password', password)
      .maybeSingle()

    if (tech) {
      // Manual tech session
      localStorage.setItem(TECH_SESSION_KEY, JSON.stringify({
        email: tech.email,
        name: tech.full_name,
        specialty: tech.specialty,
      }))
      showToast(`Welcome, ${tech.full_name}!`, 'success')
      setTimeout(() => {
        window.location.href = '/pages/private/technician/index.html'
      }, 200)
      return
    }

    // 2. Second check: Supabase Auth login (admin / regular users)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    showToast('Signed in successfully!', 'success')

    // 3. Redirect based on role
    if (data.user?.email === 'admin@admin.com') {
      setTimeout(() => { window.location.href = '/pages/private/admin/index.html' }, 200)
    } else {
      setTimeout(() => { window.location.href = '/' }, 200)
    }
  } catch (err) {
    showToast(err.message, 'error')
    submitBtn.textContent = originalText
    submitBtn.disabled = false
  }
}

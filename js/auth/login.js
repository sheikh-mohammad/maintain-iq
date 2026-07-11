/* ==========================================================================
   MaintainIQ - Login Page Handler
   ========================================================================== */

import { supabase, showToast, redirectAfterAuth } from './auth.js'

document.addEventListener('DOMContentLoaded', () => {
  // Already logged in? Redirect based on role.
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      redirectAfterAuth(session.user)
    }
  })

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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) throw error

    showToast('Signed in successfully!', 'success')
    // Give the toast a moment to show before redirect
    setTimeout(() => redirectAfterAuth(data.user), 200)
  } catch (err) {
    showToast(err.message, 'error')
    submitBtn.textContent = originalText
    submitBtn.disabled = false
  }
}

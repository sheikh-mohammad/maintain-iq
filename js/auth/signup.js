/* ==========================================================================
   MaintainIQ - Signup Page Handler
   ========================================================================== */

import { supabase, showToast, redirectAfterAuth } from './auth.js'

document.addEventListener('DOMContentLoaded', () => {
  // Already logged in? Redirect based on role.
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      redirectAfterAuth(session.user)
    }
  })

  initSignupForm()
})

function initSignupForm() {
  const form = document.getElementById('signup-form')
  if (!form) return
  form.addEventListener('submit', handleSignup)
}

async function handleSignup(e) {
  e.preventDefault()

  const form = e.currentTarget
  const name = form.querySelector('#signup-name').value.trim()
  const email = form.querySelector('#signup-email').value.trim()
  const password = form.querySelector('#signup-password').value
  const submitBtn = form.querySelector('.auth-submit')

  // ── Validation ──
  if (!name || !email || !password) {
    showToast('Please fill in all fields.', 'error')
    return
  }
  if (password.length < 6) {
    showToast('Password must be at least 6 characters.', 'error')
    return
  }

  // ── Loading ──
  const originalText = submitBtn.textContent
  submitBtn.textContent = 'Creating Account...'
  submitBtn.disabled = true

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    })

    if (error) throw error

    // User already exists
    if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
      showToast('An account with this email already exists.', 'error')
      submitBtn.textContent = originalText
      submitBtn.disabled = false
      return
    }

    // Session returned (email confirmation disabled) → auto-logged-in
    if (data.session) {
      showToast('Account created! Welcome aboard.', 'success')
      setTimeout(() => redirectAfterAuth(data.user), 200)
      return
    }

    // Email confirmation required
    showToast('Account created! Check your email for a confirmation link.', 'success')
    submitBtn.textContent = 'Account Created'
    submitBtn.disabled = true
  } catch (err) {
    showToast(err.message, 'error')
    submitBtn.textContent = originalText
    submitBtn.disabled = false
  }
}

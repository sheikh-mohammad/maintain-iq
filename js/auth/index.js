/* ==========================================================================
   MaintainIQ - Auth Pages Script
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initAuthForms();
});

function initAuthForms() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', e => {
      e.preventDefault();
    });
  }
}

/* ==========================================================================
   MaintainIQ - Runtime configuration.
   Values are injected at deploy time by the Vercel build command into
   /config.js (window.PROJECT_URL, window.PUBLISH_KEY, window.ADMIN_EMAIL) —
   they are NOT hardcoded here. Loaded on every page before the module
   scripts, so these globals are ready before auth.js imports this module.
   ========================================================================== */

if (!window.PROJECT_URL || !window.PUBLISH_KEY || !window.ADMIN_EMAIL) {
  console.error(
    '[config] Missing runtime globals. On Vercel, set the PROJECT_URL / PUBLISH_KEY / ADMIN_EMAIL ' +
    'environment variables and redeploy. For local dev, copy config.example.js to config.js.',
  )
}

const PROJECT_URL = window.PROJECT_URL
const PUBLISH_KEY = window.PUBLISH_KEY
const ADMIN_EMAIL = window.ADMIN_EMAIL

export { PROJECT_URL, PUBLISH_KEY, ADMIN_EMAIL }

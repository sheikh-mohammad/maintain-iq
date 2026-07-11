/* ==========================================================================
   MaintainIQ - Public Asset Page Script
   Shows all registered assets. Highlights the asset matching #code if present.
   ========================================================================== */

import { supabase } from '../auth/auth.js'

document.addEventListener('DOMContentLoaded', () => {
  loadAllAssets()
})

async function loadAllAssets() {
  const loading = document.getElementById('assets-loading')
  const empty = document.getElementById('assets-empty')
  const grid = document.getElementById('assets-grid')

  const { data: assets, error } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false })

  loading.style.display = 'none'

  if (error || !assets || assets.length === 0) {
    empty.style.display = 'block'
    return
  }

  grid.style.display = 'grid'

  const scannedCode = window.location.hash.replace('#', '').trim()

  grid.innerHTML = assets.map(a => {
    const statusClass = a.status === 'Operational' ? 'badge-emerald'
      : a.status === 'Issue Reported' ? 'badge-orange'
      : a.status === 'Under Maintenance' ? 'badge-purple'
      : 'badge-red'

    const isHighlighted = scannedCode && String(a.assetCode) === scannedCode

    return `
      <div class="public-asset-card ${isHighlighted ? 'highlighted' : ''}" data-code="${a.assetCode}">
        <div class="public-asset-top">
          <div class="public-asset-info">
            <h3>${a.name}</h3>
            <span class="public-asset-code">Code: ${a.assetCode}</span>
          </div>
          <span class="badge ${statusClass}">${a.status}</span>
        </div>
        <div class="public-asset-meta">
          <span><strong>Category:</strong> ${a.category || '—'}</span>
          <span><strong>Location:</strong> ${a.location || '—'}</span>
        </div>
        ${a.assignedTechnician ? `<div class="public-asset-tech">Technician: ${a.assignedTechnician}</div>` : ''}
        <div class="public-asset-qr" id="qr-${a.assetCode}"></div>
      </div>
    `
  }).join('')

  // Generate QR codes for each asset + scroll to highlighted
  let highlightedEl = null

  assets.forEach(a => {
    const container = document.querySelector(`#qr-${a.assetCode}`)
    if (!container) return

    const url = `${window.location.origin}/pages/public/assets.html#${a.assetCode}`
    new QRCode(container, { text: url, width: 120, height: 120 })

    if (scannedCode && String(a.assetCode) === scannedCode) {
      highlightedEl = document.querySelector(`.public-asset-card[data-code="${a.assetCode}"]`)
    }
  })

  // Scroll to highlighted asset
  if (highlightedEl) {
    setTimeout(() => {
      highlightedEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  }
}

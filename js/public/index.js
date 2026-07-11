/* ==========================================================================
   MaintainIQ - Public Asset Page Script
   Shows all assets. QR scan (#code) highlights the scanned asset.
   Each asset has a Report Issue button that opens a modal.
   ========================================================================== */

import { supabase, showToast, createHistoryLog, getCachedUser } from '../auth/auth.js'

let isLoggedIn = false

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in
  const cached = getCachedUser()
  const { data: { session } } = await supabase.auth.getSession()
  isLoggedIn = !!(cached || session)

  const scannedCode = window.location.hash.replace('#', '').trim()

  if (scannedCode) {
    loadSingleAsset(scannedCode)
  } else {
    loadAllAssets()
  }

  if (isLoggedIn) {
    initReportModal()
  }
})

/* ── Load single asset from QR scan ───────────────────────────────────── */

async function loadSingleAsset(assetCode) {
  const loading = document.getElementById('assets-loading')
  const empty = document.getElementById('assets-empty')
  const grid = document.getElementById('assets-grid')
  const detail = document.getElementById('asset-detail')

  loading.style.display = 'block'

  const { data: asset, error } = await supabase
    .from('assets')
    .select('*')
    .eq('assetCode', assetCode)
    .maybeSingle()

  loading.style.display = 'none'

  if (error || !asset) {
    empty.style.display = 'block'
    empty.querySelector('h2').textContent = 'Asset Not Found'
    empty.querySelector('p').textContent = `No asset found with code "${assetCode}". The asset may have been removed or the QR code is invalid.`
    return
  }

  // Show detail view
  detail.style.display = 'block'
  populateAssetDetail(asset)

  // Load activity history
  loadAssetHistory(asset.assetCode)

  // Wire back button
  document.getElementById('btn-back-to-assets').addEventListener('click', () => {
    window.location.hash = ''
    detail.style.display = 'none'
    grid.style.display = 'grid'
    loadAllAssets()
  })

  // Wire report button (only if logged in)
  const reportBtn = document.getElementById('btn-report-from-detail')
  if (isLoggedIn) {
    reportBtn.textContent = 'Report Issue for This Asset'
    reportBtn.className = 'btn btn-primary'
    reportBtn.onclick = () => openReportModal(asset.assetCode, asset.name)
  } else {
    reportBtn.textContent = 'Sign in to Report Issue'
    reportBtn.className = 'btn btn-secondary'
    reportBtn.onclick = () => { window.location.href = '../auth/login.html' }
  }
  reportBtn.style.display = ''
}

function populateAssetDetail(asset) {
  document.getElementById('detail-asset-name').textContent = asset.name
  document.getElementById('detail-asset-code').textContent = `Code: ${asset.assetCode}`
  document.getElementById('detail-asset-category').textContent = asset.category || '—'
  document.getElementById('detail-asset-location').textContent = asset.location || '—'
  document.getElementById('detail-asset-condition').textContent = asset.condition || '—'
  const techEl = document.getElementById('detail-asset-tech')
  if (techEl) techEl.style.display = 'none'

  const statusEl = document.getElementById('detail-asset-status')
  const statusClass = asset.status === 'Operational' ? 'badge-emerald'
    : asset.status === 'Issue Reported' ? 'badge-orange'
    : asset.status === 'Under Maintenance' ? 'badge-purple'
    : 'badge-red'
  statusEl.textContent = asset.status
  statusEl.className = `badge ${statusClass}`

  // Generate QR
  const qrContainer = document.getElementById('detail-asset-qr')
  qrContainer.innerHTML = ''
  const url = `${window.location.origin}/pages/public/assets.html#${asset.assetCode}`
  new QRCode(qrContainer, { text: url, width: 150, height: 150 })
}

async function loadAssetHistory(assetCode) {
  const container = document.getElementById('detail-history-timeline')

  // Load issues for this asset
  const { data: issues } = await supabase
    .from('issues')
    .select('*')
    .eq('assetId', assetCode)
    .order('created_at', { ascending: false })
    .limit(10)

  // Load maintenance records for this asset
  const { data: records } = await supabase
    .from('maintenance_records')
    .select('*')
    .eq('asset_id', assetCode)
    .order('created_at', { ascending: false })
    .limit(10)

  const events = []

  if (issues) {
    issues.forEach(i => {
      events.push({
        date: i.created_at,
        type: 'issue',
        title: i.title,
        detail: `${i.priority} priority — ${i.status}`,
      })
    })
  }

  if (records) {
    records.forEach(r => {
      events.push({
        date: r.created_at,
        type: 'maintenance',
        title: r.actions_taken || 'Maintenance performed',
        detail: r.status === 'Completed' ? `Completed — $${r.cost}` : r.status,
      })
    })
  }

  // Sort by date descending
  events.sort((a, b) => new Date(b.date) - new Date(a.date))

  if (events.length === 0) {
    container.innerHTML = '<p class="text-gray">No activity recorded yet for this asset.</p>'
    return
  }

  container.innerHTML = events.map(e => `
    <div class="history-event">
      <div class="history-event-dot ${e.type === 'issue' ? 'dot-issue' : 'dot-maintenance'}"></div>
      <div class="history-event-content">
        <span class="history-event-title">${e.title}</span>
        <span class="history-event-detail">${e.detail}</span>
        <span class="history-event-date">${new Date(e.date).toLocaleDateString()}</span>
      </div>
    </div>
  `).join('')
}

/* ── Load & display all assets ──────────────────────────────────────────── */

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
          <span><strong>Condition:</strong> ${a.condition || '—'}</span>
        </div>

        <div class="public-asset-qr" id="qr-${a.assetCode}"></div>

        ${isLoggedIn
          ? `<button class="btn btn-primary report-issue-btn" data-code="${a.assetCode}" data-name="${a.name}">
              Report Issue
            </button>`
          : `<a href="../auth/login.html" class="btn btn-secondary" style="width:100%;justify-content:center;text-decoration:none;">
              Sign in to Report Issue
            </a>`}
      </div>
    `
  }).join('')

  // Generate QR codes
  let highlightedEl = null

  assets.forEach(a => {
    const container = document.querySelector(`#qr-${a.assetCode}`)
    if (!container) return

    const url = `${window.location.origin}/pages/public/assets.html#${a.assetCode}`
    new QRCode(container, { text: url, width: 130, height: 130 })

    if (scannedCode && String(a.assetCode) === scannedCode) {
      highlightedEl = document.querySelector(`.public-asset-card[data-code="${a.assetCode}"]`)
    }
  })

  // Scroll to highlighted asset from QR scan
  if (highlightedEl) {
    setTimeout(() => {
      highlightedEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 400)
  }

  // Attach report issue handlers
  document.querySelectorAll('.report-issue-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.code
      const name = btn.dataset.name
      openReportModal(code, name)
    })
  })
}

/* ── Report Issue Modal ──────────────────────────────────────────────────── */

function initReportModal() {
  // Close modal handlers
  document.querySelectorAll('.modal-close[data-modal="modal-report-issue"]').forEach(btn => {
    btn.addEventListener('click', () => closeModal('modal-report-issue'))
  })

  document.querySelectorAll('.modal-footer .btn-secondary[data-modal="modal-report-issue"]').forEach(btn => {
    btn.addEventListener('click', () => closeModal('modal-report-issue'))
  })

  document.getElementById('modal-report-issue')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal('modal-report-issue')
  })

  // Submit handler
  document.getElementById('btn-submit-report')?.addEventListener('click', handleSubmitReport)
}

async function openReportModal(assetCode, assetName) {
  document.getElementById('report-asset-display').value = `${assetName} (Code: ${assetCode})`
  document.getElementById('report-asset-display').dataset.assetCode = assetCode
  document.getElementById('report-title').value = ''
  document.getElementById('report-description').value = ''
  document.getElementById('report-priority').value = 'Medium'

  // Auto-fill email from logged-in user
  const emailInput = document.getElementById('report-email')
  const techSession = localStorage.getItem('maintainiq-tech-session')

  if (techSession) {
    try {
      const tech = JSON.parse(techSession)
      emailInput.value = tech.email || ''
    } catch { /* ignore */ }
  } else {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.email) {
      emailInput.value = session.user.email
    } else {
      emailInput.value = ''
    }
  }

  emailInput.readOnly = !!emailInput.value

  openModal('modal-report-issue')
}

async function handleSubmitReport() {
  const assetDisplay = document.getElementById('report-asset-display')
  const assetCode = assetDisplay.dataset.assetCode
  const title = document.getElementById('report-title').value.trim()
  const description = document.getElementById('report-description').value.trim()
  const priority = document.getElementById('report-priority').value
  const reporterEmail = document.getElementById('report-email').value.trim()
  const submitBtn = document.getElementById('btn-submit-report')

  if (!title || !description || !reporterEmail) {
    showToast('Please fill in title, description, and email.', 'error')
    return
  }

  submitBtn.textContent = 'Submitting...'
  submitBtn.disabled = true

  try {
    const { error } = await supabase
      .from('issues')
      .insert({
        assetId: Number(assetCode),
        title,
        description,
        priority,
        status: 'Reported',
        reporterEmail,
      })

    if (error) throw error

    // Update asset status to "Issue Reported"
    await supabase
      .from('assets')
      .update({ status: 'Issue Reported' })
      .eq('assetCode', assetCode)

    // Log history
    const assetName = document.getElementById('report-asset-display').value.split(' (Code:')[0] || assetCode
    createHistoryLog({
      asset_code: String(assetCode),
      asset_name: assetName,
      action: 'Issue Reported',
      actor: reporterEmail,
      detail: `${title} — ${priority}`,
    })

    showToast('Issue reported successfully!', 'success')
    closeModal('modal-report-issue')

    // If we're on the detail view, refresh it
    const detail = document.getElementById('asset-detail')
    if (detail.style.display !== 'none') {
      loadSingleAsset(assetCode)
    }
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    submitBtn.textContent = 'Submit Issue'
    submitBtn.disabled = false
  }
}

/* ── Modal helpers ────────────────────────────────────────────────────────── */

function openModal(id) {
  const modal = document.getElementById(id)
  if (!modal) return
  modal.classList.add('open')
  document.body.style.overflow = 'hidden'
}

function closeModal(id) {
  const modal = document.getElementById(id)
  if (!modal) return
  modal.classList.remove('open')
  document.body.style.overflow = ''
}

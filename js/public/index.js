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

  // Wire report button (only if logged in and asset not retired)
  const reportBtn = document.getElementById('btn-report-from-detail')
  if (asset.status === 'Retired') {
    reportBtn.textContent = 'This asset is retired'
    reportBtn.className = 'btn btn-secondary'
    reportBtn.onclick = null
    reportBtn.style.opacity = '0.5'
  } else if (isLoggedIn) {
    reportBtn.textContent = 'Report Issue for This Asset'
    reportBtn.className = 'btn btn-primary'
    reportBtn.onclick = () => openReportModal(asset.assetCode, asset.name)
    reportBtn.style.opacity = '1'
  } else {
    reportBtn.textContent = 'Sign in to Report Issue'
    reportBtn.className = 'btn btn-secondary'
    reportBtn.onclick = () => { window.location.href = '../auth/login.html' }
    reportBtn.style.opacity = '1'
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

  // Service dates from maintenance_records
  loadServiceDates(asset)

  const statusEl = document.getElementById('detail-asset-status')
  const statusClass = asset.status === 'Operational' ? 'badge-emerald'
    : asset.status === 'Issue Reported' ? 'badge-orange'
    : asset.status === 'Under Inspection' ? 'badge-blue'
    : asset.status === 'Under Maintenance' ? 'badge-purple'
    : asset.status === 'Out of Service' ? 'badge-red'
    : asset.status === 'Retired' ? 'badge-gray'
    : 'badge-red'
  statusEl.textContent = asset.status
  statusEl.className = `badge ${statusClass}`

  // Generate QR
  const qrContainer = document.getElementById('detail-asset-qr')
  qrContainer.innerHTML = ''
  const url = `${window.location.origin}/pages/public/assets.html#${asset.assetCode}`
  new QRCode(qrContainer, { text: url, width: 150, height: 150 })
}

/* ── Load service dates for asset detail ──────────────────────────────── */

async function loadServiceDates(asset) {
  const { data: records } = await supabase
    .from('maintenance_records')
    .select('completed_at, next_service_date')
    .eq('asset_id', asset.assetCode)
    .order('created_at', { ascending: false })
    .limit(1)

  const lastSvcEl = document.getElementById('detail-asset-last-service')
  const nextSvcEl = document.getElementById('detail-asset-next-service')
  if (records && records.length > 0) {
    const r = records[0]
    if (lastSvcEl) lastSvcEl.textContent = r.completed_at ? new Date(r.completed_at).toLocaleDateString() : '—'
    if (nextSvcEl) nextSvcEl.textContent = r.next_service_date ? new Date(r.next_service_date).toLocaleDateString() : '—'
  } else {
    if (lastSvcEl) lastSvcEl.textContent = '—'
    if (nextSvcEl) nextSvcEl.textContent = '—'
  }
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

  // Fetch maintenance records for service dates
  const { data: maintenanceRecords } = await supabase
    .from('maintenance_records')
    .select('asset_id, completed_at, next_service_date, status')
    .order('created_at', { ascending: false })

  // Build a map of assetCode -> latest maintenance data
  const serviceDateMap = {}
  if (maintenanceRecords) {
    maintenanceRecords.forEach(r => {
      const key = String(r.asset_id)
      if (!serviceDateMap[key]) {
        serviceDateMap[key] = {
          lastServiceDate: r.completed_at || null,
          nextServiceDate: r.next_service_date || null,
        }
      }
    })
  }

  // Fetch issue counts per asset for activity summary
  const { data: allIssues } = await supabase
    .from('issues')
    .select('assetId, status')
    .order('created_at', { ascending: false })

  const issueCountMap = {}
  if (allIssues) {
    allIssues.forEach(i => {
      const key = String(i.assetId)
      if (!issueCountMap[key]) issueCountMap[key] = { total: 0, open: 0 }
      issueCountMap[key].total++
      if (i.status !== 'Resolved' && i.status !== 'Closed') issueCountMap[key].open++
    })
  }

  grid.style.display = 'grid'

  const scannedCode = window.location.hash.replace('#', '').trim()

  grid.innerHTML = assets.map(a => {
    const code = String(a.assetCode)
    const isRetired = a.status === 'Retired'

    const statusClass = a.status === 'Operational' ? 'badge-emerald'
      : a.status === 'Issue Reported' ? 'badge-orange'
      : a.status === 'Under Inspection' ? 'badge-blue'
      : a.status === 'Under Maintenance' ? 'badge-purple'
      : a.status === 'Out of Service' ? 'badge-red'
      : a.status === 'Retired' ? 'badge-gray'
      : 'badge-red'

    const svc = serviceDateMap[code]
    const lastSvc = svc?.lastServiceDate ? new Date(svc.lastServiceDate).toLocaleDateString() : '—'
    const nextSvc = svc?.nextServiceDate ? new Date(svc.nextServiceDate).toLocaleDateString() : '—'

    const activity = issueCountMap[code]
    let activityHtml = ''
    if (activity && activity.total > 0) {
      const icon = activity.open > 0
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fb923c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
      activityHtml = `<div class="public-asset-activity">${icon}${activity.total} issue(s) — ${activity.open} open</div>`
    } else {
      activityHtml = `<div class="public-asset-activity" style="color:var(--text-gray-600);">No activity recorded</div>`
    }

    const isHighlighted = scannedCode && code === scannedCode

    // Report issue button or retired notice
    let actionHtml
    if (isRetired) {
      actionHtml = `<span class="public-asset-retired-notice">This asset is retired</span>`
    } else if (isLoggedIn) {
      actionHtml = `<button class="btn btn-primary report-issue-btn" data-code="${a.assetCode}" data-name="${a.name}">Report Issue</button>`
    } else {
      actionHtml = `<a href="../auth/login.html" class="btn btn-secondary" style="width:100%;justify-content:center;text-decoration:none;">Sign in to Report Issue</a>`
    }

    return `
      <div class="public-asset-card ${isHighlighted ? 'highlighted' : ''}" data-code="${a.assetCode}" data-status="${a.status}" data-category="${a.category || ''}">
        <div class="public-asset-top">
          <div class="public-asset-info">
            <h3>${escHtml(a.name)}</h3>
            <span class="public-asset-code">Code: ${escHtml(a.assetCode)}</span>
          </div>
          <span class="badge ${statusClass}">${a.status}</span>
        </div>

        <div class="public-asset-details">
          <div><span class="detail-label">Category</span><span class="detail-value">${escHtml(a.category || '—')}</span></div>
          <div><span class="detail-label">Location</span><span class="detail-value">${escHtml(a.location || '—')}</span></div>
          <div><span class="detail-label">Condition</span><span class="detail-value">${escHtml(a.condition || '—')}</span></div>
          <div><span class="detail-label">Last Service</span><span class="detail-value ${lastSvc === '—' ? 'muted' : ''}">${lastSvc}</span></div>
          <div><span class="detail-label">Next Service</span><span class="detail-value ${nextSvc === '—' ? 'muted' : ''}">${nextSvc}</span></div>
        </div>

        ${activityHtml}

        <div class="public-asset-qr" id="qr-${a.assetCode}"></div>

        ${actionHtml}
      </div>
    `
  }).join('')

  // Generate QR codes & highlight
  let highlightedEl = null
  const assetCodes = assets.map(a => a.assetCode)

  assetCodes.forEach(code => {
    const container = document.querySelector(`#qr-${code}`)
    if (!container) return

    const url = `${window.location.origin}/pages/public/assets.html#${code}`
    new QRCode(container, { text: url, width: 120, height: 120 })

    if (scannedCode && String(code) === scannedCode) {
      highlightedEl = document.querySelector(`.public-asset-card[data-code="${code}"]`)
    }
  })

  // Scroll to highlighted asset from QR scan
  if (highlightedEl) {
    setTimeout(() => { highlightedEl.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 400)
  }

  // Attach report issue handlers
  document.querySelectorAll('.report-issue-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openReportModal(btn.dataset.code, btn.dataset.name)
    })
  })

  // Init search/filter
  initPublicSearchAndFilters()
}

function escHtml(str) {
  const d = document.createElement('div')
  d.textContent = str
  return d.innerHTML
}

/* ── Public assets search & filter ─────────────────────────────────────── */

function initPublicSearchAndFilters() {
  const input = document.getElementById('public-asset-search')
  const statusFilter = document.getElementById('public-filter-status')
  const categoryFilter = document.getElementById('public-filter-category')
  if (!input) return

  function applyFilters() {
    const term = input.value.trim().toLowerCase()
    const statusVal = statusFilter?.value?.toLowerCase() || ''
    const catVal = categoryFilter?.value?.toLowerCase() || ''
    const cards = document.querySelectorAll('.public-asset-card')
    let visibleCount = 0

    cards.forEach(card => {
      let show = true
      if (term && !card.textContent.toLowerCase().includes(term)) show = false
      if (show && statusVal && (card.dataset.status || '').toLowerCase() !== statusVal) show = false
      if (show && catVal && (card.dataset.category || '').toLowerCase() !== catVal) show = false
      card.style.display = show ? '' : 'none'
      if (show) visibleCount++
    })

    // Show/hide no-results message
    const existing = document.querySelector('.public-no-results')
    if (visibleCount === 0 && (term || statusVal || catVal)) {
      if (!existing) {
        const msg = document.createElement('div')
        msg.className = 'public-no-results'
        msg.textContent = 'No assets match your search or filters.'
        document.getElementById('assets-grid')?.appendChild(msg)
      }
    } else if (existing) {
      existing.remove()
    }
  }

  input.addEventListener('input', applyFilters)
  if (statusFilter) statusFilter.addEventListener('change', applyFilters)
  if (categoryFilter) categoryFilter.addEventListener('change', applyFilters)
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
  // Check if asset is retired
  const { data: asset } = await supabase
    .from('assets')
    .select('status')
    .eq('assetCode', assetCode)
    .maybeSingle()

  if (asset?.status === 'Retired') {
    showToast('This asset is retired and cannot accept new issues.', 'error')
    return
  }

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
    // Safety check: verify asset is not retired
    const { data: currentAsset } = await supabase
      .from('assets')
      .select('status')
      .eq('assetCode', assetCode)
      .maybeSingle()

    if (currentAsset?.status === 'Retired') {
      showToast('This asset is retired and cannot accept new issues.', 'error')
      return
    }

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

    // Update asset status — Critical issues set to Out of Service
    const newAssetStatus = priority === 'Critical' ? 'Out of Service' : 'Issue Reported'
    await supabase
      .from('assets')
      .update({ status: newAssetStatus })
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

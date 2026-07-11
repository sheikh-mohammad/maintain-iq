/* ==========================================================================
   MaintainIQ - Public Asset Page Script
   Shows all assets. QR scan (#code) highlights the scanned asset.
   Each asset has a Report Issue button that opens a modal.
   ========================================================================== */

import { supabase, showToast } from '../auth/auth.js'

document.addEventListener('DOMContentLoaded', () => {
  loadAllAssets()
  initReportModal()
})

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
          <span><strong>Technician:</strong> ${a.assignedTechnician || 'Not assigned'}</span>
        </div>

        <div class="public-asset-qr" id="qr-${a.assetCode}"></div>

        <button class="btn btn-primary report-issue-btn" data-code="${a.assetCode}" data-name="${a.name}">
          Report Issue
        </button>
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

    showToast('Issue reported successfully!', 'success')
    closeModal('modal-report-issue')
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

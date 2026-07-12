/* ==========================================================================
   MaintainIQ - Admin Dashboard Script
   ========================================================================== */

import { requireAdmin, supabase, showToast, createHistoryLog, getTechSession } from '../../auth/auth.js'

document.addEventListener('DOMContentLoaded', async () => {
  const ok = await requireAdmin()
  if (!ok) return

  initSidebarNavigation()
  initSidebarToggle()
  initModals()
  initTableActions()
  initCreateTechnician()
  initCreateAsset()
  loadTechnicians()
  loadAssets()
  loadIssues()
  loadMaintenanceRecords()
  loadDashboardStats()
  loadHistoryLog()
})

/* --- Sidebar Navigation --- */
function initSidebarNavigation() {
  const links = document.querySelectorAll('.sidebar-link[data-page]')
  const pages = document.querySelectorAll('.admin-page')
  const pageTitle = document.getElementById('page-title')

  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault()
      links.forEach(l => l.classList.remove('active'))
      link.classList.add('active')

      const pageId = link.dataset.page
      pages.forEach(p => p.classList.remove('active'))

      const target = document.getElementById(`page-${pageId}`)
      if (target) {
        target.classList.add('active')
        pageTitle.textContent = link.querySelector('span').textContent
      }

      const sidebar = document.getElementById('admin-sidebar')
      if (window.innerWidth <= 768) sidebar.classList.remove('open')
    })
  })
}

/* --- Sidebar Toggle --- */
function initSidebarToggle() {
  const toggleBtn = document.getElementById('mobile-sidebar-toggle')
  const collapseBtn = document.getElementById('sidebar-collapse')
  const sidebar = document.getElementById('admin-sidebar')
  if (!sidebar) return

  // Mobile: show/hide sidebar
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'))
  }

  // Desktop: expand/collapse
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed')
      // On mobile, also show sidebar when expanding
      if (window.innerWidth <= 768 && !sidebar.classList.contains('open')) {
        sidebar.classList.add('open')
      }
    })
  }

  // Click outside to close on mobile
  document.addEventListener('click', e => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && !toggleBtn?.contains(e.target)) {
        sidebar.classList.remove('open')
      }
    }
  })
}

/* --- Modals --- */
function initModals() {
  const openTriggers = {
    'btn-create-asset': 'modal-create-asset',
    'btn-create-technician': 'modal-create-technician',
  }

  Object.entries(openTriggers).forEach(([btnId, modalId]) => {
    const btn = document.getElementById(btnId)
    if (!btn) return
    btn.addEventListener('click', () => openModal(modalId))
  })

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal
      closeModal(modalId)
      // Clean up QR container when closing QR modal
      if (modalId === 'modal-qr-result') {
        const container = document.getElementById('qr-code-container')
        if (container) container.innerHTML = ''
      }
    })
  })

  document.querySelectorAll('.modal-footer .btn-secondary[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal
      closeModal(modalId)
    })
  })

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.classList.remove('open')
        const container = document.getElementById('qr-code-container')
        if (container) container.innerHTML = ''
      }
    })
  })

  const assignSubmitBtn = document.getElementById('modal-assign-tech-submit')
  if (assignSubmitBtn) {
    assignSubmitBtn.addEventListener('click', handleAssignTechnician)
  }
}

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

/* =====================================================================
   ASSETS
   ===================================================================== */

/* --- Load Assets Table --- */

async function loadAssets() {
  const tbody = document.getElementById('assets-table-body')
  if (!tbody) return

  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false })

  if (!assets || assets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No assets registered. Click "Create Asset" to add one.</td></tr>`
    return
  }

  tbody.innerHTML = assets.map(a => {
    const statusClass = a.status === 'Operational' ? 'badge-emerald'
      : a.status === 'Issue Reported' ? 'badge-orange'
      : a.status === 'Under Inspection' ? 'badge-blue'
      : a.status === 'Under Maintenance' ? 'badge-purple'
      : a.status === 'Out of Service' ? 'badge-red'
      : a.status === 'Retired' ? 'badge-red'
      : 'badge-orange'

    const canChangeStatus = a.status !== 'Retired'

    return `
    <tr>
      <td>
        <div class="asset-name-cell">
          <span>${a.name}</span>
        </div>
      </td>
      <td><code style="font-size:0.8125rem;color:var(--text-gray-500);background:var(--bg-tertiary);padding:0.2rem 0.4rem;border-radius:4px;">${a.assetCode}</code></td>
      <td>${a.category}</td>
      <td>${a.location}</td>
      <td><span class="badge ${statusClass}">${a.status}</span></td>
      <td>
        <button class="table-action-btn preview-qr-btn" data-code="${a.assetCode}" data-name="${a.name}">QR</button>
      </td>
      <td>
        ${canChangeStatus ? `
        <select class="admin-status-select" data-code="${a.assetCode}" data-current="${a.status}">
          <option value="">Change status...</option>
          <option value="Operational">Operational</option>
          <option value="Issue Reported">Issue Reported</option>
          <option value="Under Inspection">Under Inspection</option>
          <option value="Under Maintenance">Under Maintenance</option>
          <option value="Out of Service">Out of Service</option>
          <option value="Retired">Retired</option>
        </select>
        ` : '<span class="badge badge-red">Retired</span>'}
      </td>
    </tr>`
  }).join('')

  // Attach QR preview handlers
  tbody.querySelectorAll('.preview-qr-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.code
      const name = btn.dataset.name
      showQRModal(code, name)
    })
  })

  // Attach status change handlers
  tbody.querySelectorAll('.admin-status-select').forEach(select => {
    select.addEventListener('change', async () => {
      const newStatus = select.value
      if (!newStatus) return

      const assetCode = Number(select.dataset.code)
      const oldStatus = select.dataset.current

      const { error } = await supabase
        .from('assets')
        .update({ status: newStatus })
        .eq('assetCode', assetCode)

      if (error) {
        showToast(error.message, 'error')
      } else {
        showToast(`Asset ${assetCode} status changed: ${oldStatus} → ${newStatus}`, 'success')

        // Log history
        createHistoryLog({
          asset_code: assetCode,
          action: 'Status Changed',
          actor: 'admin@admin.com',
          detail: `${oldStatus} → ${newStatus}`,
        })

        await loadAssets()
      }
    })
  })
}

/* --- Show QR Preview (from table) --- */

function showQRModal(code, name) {
  const container = document.getElementById('qr-code-container')
  const info = document.getElementById('qr-asset-info')
  const codeDisplay = document.getElementById('qr-asset-code-display')
  const downloadBtn = document.getElementById('qr-download-btn')

  container.innerHTML = ''
  info.textContent = name

  const url = `${window.location.origin}/pages/public/assets.html#${code}`
  codeDisplay.textContent = `Asset Code: ${code}`

  new QRCode(container, { text: url, width: 180, height: 180 })

  // Download
  setTimeout(() => {
    const canvas = container.querySelector('canvas')
    if (canvas) {
      downloadBtn.href = canvas.toDataURL('image/png')
      downloadBtn.download = `asset-${code}-qrcode.png`
      downloadBtn.style.display = 'inline-flex'
    }
  }, 200)

  openModal('modal-qr-result')
}

/* --- Load Issues Table --- */

async function loadIssues() {
  const tbody = document.getElementById('issues-table-body')
  if (!tbody) return

  const { data: issues } = await supabase
    .from('issues')
    .select('*')
    .order('created_at', { ascending: false })

  if (!issues || issues.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No issues reported yet.</td></tr>`
    return
  }

  tbody.innerHTML = issues.map(issue => {
    const priorityClass = issue.priority === 'Critical' ? 'badge-red'
      : issue.priority === 'High' ? 'badge-orange'
      : issue.priority === 'Medium' ? 'badge-blue'
      : 'badge-emerald'

    const statusClass = issue.status === 'Reported' ? 'badge-orange'
      : issue.status === 'Assigned' ? 'badge-blue'
      : issue.status === 'Resolved' ? 'badge-emerald'
      : 'badge-purple'

    const assignedDisplay = issue.technician_email || '—'

    return `
      <tr>
        <td>${issue.title}</td>
        <td>${issue.assetId}</td>
        <td><span class="badge ${priorityClass}">${issue.priority}</span></td>
        <td><span class="badge ${statusClass}">${issue.status}</span></td>
        <td>${assignedDisplay}</td>
        <td>
          ${!issue.technician_email
            ? `<button class="table-action-btn" data-action="assign" data-issue="${issue.id}" data-title="${issue.title}">Assign</button>`
            : `<span class="badge badge-blue">Assigned</span>`}
        </td>
      </tr>
    `
  }).join('')
}

/* --- Create Asset --- */

function initCreateAsset() {
  const submitBtn = document.getElementById('modal-create-asset-submit')
  if (!submitBtn) return
  submitBtn.addEventListener('click', handleCreateAsset)
}

async function handleCreateAsset() {
  const name = document.getElementById('asset-name').value.trim()
  const category = document.getElementById('asset-category').value
  const location = document.getElementById('asset-location').value.trim()
  const submitBtn = document.getElementById('modal-create-asset-submit')

  if (!name || !category || !location) {
    showToast('Please fill in all fields.', 'error')
    return
  }

  submitBtn.textContent = 'Creating...'
  submitBtn.disabled = true

  try {
    // Generate a unique 6-digit asset code
    let assetCode
    let isUnique = false

    while (!isUnique) {
      assetCode = Math.floor(100000 + Math.random() * 900000)
      const { data: existing } = await supabase
        .from('assets')
        .select('id')
        .eq('assetCode', assetCode)
        .maybeSingle()
      if (!existing) isUnique = true
    }

    // Insert into Supabase
    const { error } = await supabase
      .from('assets')
      .insert({
        assetCode,
        name,
        category,
        location,
        status: 'Operational',
        assignedTechnician: '',
      })

    if (error) throw error

    // Log history
    createHistoryLog({
      asset_code: String(assetCode),
      asset_name: name,
      action: 'Asset Created',
      actor: 'admin@admin.com',
      detail: `${name} registered in ${category} at ${location}`,
    })

    // Show QR result modal
    closeModal('modal-create-asset')
    showQRModal(assetCode, name)

    // Reset form
    document.getElementById('asset-name').value = ''
    document.getElementById('asset-category').value = ''
    document.getElementById('asset-location').value = ''

    // Reload table
    await loadAssets()
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    submitBtn.textContent = 'Create Asset'
    submitBtn.disabled = false
  }
}

async function handleAssignTechnician() {
  const select = document.getElementById('assign-tech-select')
  const submitBtn = document.getElementById('modal-assign-tech-submit')
  const techEmail = select?.value

  if (!selectedIssueId || !techEmail) {
    showToast('Please select a technician.', 'error')
    return
  }

  submitBtn.textContent = 'Assigning...'
  submitBtn.disabled = true

  try {
    const { error } = await supabase
      .from('issues')
      .update({ technician_email: techEmail, status: 'Assigned' })
      .eq('id', selectedIssueId)

    if (error) throw error

    // Log history
    createHistoryLog({
      action: 'Issue Assigned',
      actor: 'admin@admin.com',
      detail: `Issue assigned to ${techEmail}`,
      issue_id: selectedIssueId,
    })

    showToast('Issue assigned successfully!', 'success')
    closeModal('modal-assign-tech')
    selectedIssueId = null
    select.value = ''

    // Reload issues table
    await loadIssues()
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    submitBtn.textContent = 'Assign'
    submitBtn.disabled = false
  }
}

/* =====================================================================
   MAINTENANCE RECORDS
   ===================================================================== */

/* --- Load Maintenance Records Table --- */

async function loadMaintenanceRecords() {
  const tbody = document.getElementById('maintenance-table-body')
  if (!tbody) return

  const { data: records } = await supabase
    .from('maintenance_records')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (!records || records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No maintenance records yet. Records will appear once issues are resolved.</td></tr>`
    return
  }

  // Fetch issue titles for display
  const issueIds = [...new Set(records.map(r => r.issue_id))]
  const { data: issues } = await supabase
    .from('issues')
    .select('id, title')
    .in('id', issueIds)

  const issueMap = {}
  if (issues) {
    issues.forEach(i => { issueMap[i.id] = i.title })
  }

  tbody.innerHTML = records.map(r => {
    const statusClass = r.status === 'Completed' ? 'badge-emerald'
      : r.status === 'Cancelled' ? 'badge-red'
      : 'badge-blue'

    return `
      <tr>
        <td>${issueMap[r.issue_id] || `Issue #${r.issue_id}`}</td>
        <td>${r.asset_id}</td>
        <td>${r.technician_email}</td>
        <td>${r.completed_at ? new Date(r.completed_at).toLocaleDateString() : '—'}</td>
        <td>$${r.cost}</td>
        <td><span class="badge ${statusClass}">${r.status}</span></td>
        <td>
          <button class="table-action-btn view-record-btn" data-id="${r.id}">View</button>
        </td>
      </tr>
    `
  }).join('')

  // Attach view record handlers
  tbody.querySelectorAll('.view-record-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id
      const record = records.find(r => r.id === id)
      if (record) openMaintenanceDetail(record)
    })
  })
}

/* --- View maintenance record detail modal --- */

function openMaintenanceDetail(record) {
  // Create a modal dynamically
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.style.display = 'flex'

  overlay.innerHTML = `
    <div class="modal" style="max-width: 560px;">
      <div class="modal-header">
        <h3>Maintenance Record</h3>
        <button class="modal-close-btn" style="background:none;border:none;color:var(--text-gray-400);font-size:1.5rem;cursor:pointer;">&times;</button>
      </div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
          <div>
            <label style="font-size:0.75rem;text-transform:uppercase;color:var(--text-gray-500);font-weight:600;">Asset</label>
            <p style="margin:0.2rem 0;color:var(--text-white);">${record.asset_id}</p>
          </div>
          <div>
            <label style="font-size:0.75rem;text-transform:uppercase;color:var(--text-gray-500);font-weight:600;">Technician</label>
            <p style="margin:0.2rem 0;color:var(--text-white);">${record.technician_email}</p>
          </div>
          <div>
            <label style="font-size:0.75rem;text-transform:uppercase;color:var(--text-gray-500);font-weight:600;">Status</label>
            <p style="margin:0.2rem 0;color:var(--text-white);">${record.status}</p>
          </div>
          <div>
            <label style="font-size:0.75rem;text-transform:uppercase;color:var(--text-gray-500);font-weight:600;">Cost</label>
            <p style="margin:0.2rem 0;color:var(--text-white);">$${record.cost}</p>
          </div>
          <div>
            <label style="font-size:0.75rem;text-transform:uppercase;color:var(--text-gray-500);font-weight:600;">Date</label>
            <p style="margin:0.2rem 0;color:var(--text-white);">${new Date(record.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <label style="font-size:0.75rem;text-transform:uppercase;color:var(--text-gray-500);font-weight:600;">Completed</label>
            <p style="margin:0.2rem 0;color:var(--text-white);">${record.completed_at ? new Date(record.completed_at).toLocaleDateString() : '—'}</p>
          </div>
        </div>

        ${record.diagnosis ? `
        <div style="margin-bottom:1rem;">
          <label style="font-size:0.75rem;text-transform:uppercase;color:var(--text-gray-500);font-weight:600;">Diagnosis / Notes</label>
          <p style="margin:0.3rem 0;color:var(--text-gray-300);font-size:0.9375rem;">${record.diagnosis}</p>
        </div>` : ''}

        <div style="margin-bottom:1rem;">
          <label style="font-size:0.75rem;text-transform:uppercase;color:var(--text-gray-500);font-weight:600;">Actions Taken</label>
          <p style="margin:0.3rem 0;color:var(--text-gray-300);font-size:0.9375rem;">${record.actions_taken || '—'}</p>
        </div>

        ${record.parts_used ? `
        <div style="margin-bottom:1rem;">
          <label style="font-size:0.75rem;text-transform:uppercase;color:var(--text-gray-500);font-weight:600;">Parts Used</label>
          <p style="margin:0.3rem 0;color:var(--text-gray-300);font-size:0.9375rem;">${record.parts_used}</p>
        </div>` : ''}

        ${record.evidence_url ? `
        <div style="margin-bottom:1rem;">
          <label style="font-size:0.75rem;text-transform:uppercase;color:var(--text-gray-500);font-weight:600;">Evidence Photo</label>
          <div style="margin-top:0.5rem;">
            <img src="${record.evidence_url}" alt="Evidence" style="max-width:100%;border-radius:8px;border:1px solid var(--border-light);" />
            <a href="${record.evidence_url}" target="_blank" class="btn btn-secondary" style="margin-top:0.5rem;display:inline-flex;gap:0.35rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              Open Original
            </a>
          </div>
        </div>` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-close-btn">Close</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)
  document.body.style.overflow = 'hidden'

  // Close handlers
  overlay.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.remove()
      document.body.style.overflow = ''
    })
  })
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      overlay.remove()
      document.body.style.overflow = ''
    }
  })
}

/* =====================================================================
   DASHBOARD STATS
   ===================================================================== */

async function loadDashboardStats() {
  // Count assets
  const { count: totalAssets } = await supabase
    .from('assets')
    .select('id', { count: 'exact', head: true })

  // Count open issues (not Resolved)
  const { count: openIssues } = await supabase
    .from('issues')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'Resolved')

  // Count technicians
  const { count: totalTechs } = await supabase
    .from('technicians')
    .select('id', { count: 'exact', head: true })

  // Count resolved issues
  const { count: resolvedIssues } = await supabase
    .from('issues')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'Resolved')

  // Update stat cards
  const values = document.querySelectorAll('.stat-card-value')
  if (values.length >= 4) {
    values[0].textContent = totalAssets ?? 0
    values[1].textContent = openIssues ?? 0
    values[2].textContent = totalTechs ?? 0
    values[3].textContent = resolvedIssues ?? 0
  }

  // Hide empty state if there's data
  const emptySection = document.querySelector('.admin-empty-section')
  if (emptySection && (totalAssets > 0 || openIssues > 0)) {
    emptySection.style.display = 'none'
  }
}

/* =====================================================================
   HISTORY LOG
   ===================================================================== */

async function loadHistoryLog() {
  const timeline = document.getElementById('history-timeline')
  if (!timeline) return

  // Fetch from history_log table
  const { data: logEntries } = await supabase
    .from('history_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  const events = []

  if (logEntries && logEntries.length > 0) {
    events.push(...logEntries.map(e => ({
      id: e.id,
      date: e.created_at,
      action: e.action,
      actor: e.actor,
      detail: e.detail,
      extra: e.asset_name ? `${e.asset_name}${e.asset_code ? ` (${e.asset_code})` : ''}` : '',
      type: e.action === 'Asset Created' ? 'create'
        : e.action === 'Issue Reported' ? 'issue'
        : e.action === 'Issue Resolved' ? 'resolve'
        : 'update',
    })))
  }

  // Also pull from maintenance_records as fallback
  const { data: records } = await supabase
    .from('maintenance_records')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (records && records.length > 0) {
    // Only add maintenance records that don't already have a matching history entry
    const historyIssueIds = new Set(
      events.filter(e => e.action.includes('Maintenance') || e.action === 'Issue Resolved').map(e => e.id)
    )

    records.forEach(r => {
      events.push({
        id: `mr-${r.id}`,
        date: r.created_at,
        action: r.status === 'Completed' ? 'Issue Resolved' : 'Maintenance Updated',
        actor: r.technician_email,
        detail: r.status === 'Completed'
          ? `Resolved — Cost: $${r.cost}`
          : `${r.status} — ${(r.actions_taken || '').substring(0, 80)}`,
        extra: `Asset: ${r.asset_id}`,
        type: r.status === 'Completed' ? 'resolve' : 'update',
      })
    })
  }

  // Sort all events by date descending
  events.sort((a, b) => new Date(b.date) - new Date(a.date))

  if (events.length === 0) {
    timeline.innerHTML = `
      <div class="history-empty">
        <svg class="history-empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <h4>No History Yet</h4>
        <p>Events will automatically appear here as assets are created, issues are reported, and maintenance actions are completed.</p>
      </div>`
    return
  }

  // Remove duplicates (keep first occurrence)
  const seen = new Set()
  const unique = events.filter(e => {
    const key = `${e.action}-${e.actor}-${e.date}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  timeline.innerHTML = unique.map(e => {
    const dotClass = e.type === 'create' ? 'dot-create'
      : e.type === 'issue' ? 'dot-issue'
      : e.type === 'resolve' ? 'dot-resolve'
      : 'dot-update'

    return `
      <div class="history-entry" style="display:block;">
        <div class="history-entry-dot ${dotClass}"></div>
        <div class="history-entry-content">
          <div class="history-entry-header">
            <span class="history-entry-action">${e.action}</span>
            <span class="history-entry-date">${new Date(e.date).toLocaleString()}</span>
          </div>
          <div class="history-entry-details">${e.detail}</div>
          <div class="history-entry-actor">by <strong>${e.actor}</strong>${e.extra ? ` — ${e.extra}` : ''}</div>
        </div>
      </div>`
  }).join('')
}

/* =====================================================================
   TECHNICIANS
   ===================================================================== */

/* --- Load Technicians Table --- */

async function loadTechnicians() {
  const tbody = document.getElementById('technicians-table-body')
  if (!tbody) return

  const { data: techs } = await supabase
    .from('technicians')
    .select('id, full_name, specialty, email, created_at')
    .order('created_at', { ascending: false })

  if (!techs || techs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No technicians added. Click "Add Technician" to add one.</td></tr>`
    return
  }

  tbody.innerHTML = techs.map(t => `
    <tr>
      <td>${t.full_name}</td>
      <td>${t.specialty}</td>
      <td>${t.email}</td>
      <td><span class="badge badge-emerald">Active</span></td>
      <td>—</td>
    </tr>
  `).join('')
}

/* --- Create Technician --- */

function initCreateTechnician() {
  const submitBtn = document.getElementById('modal-create-technician-submit')
  if (!submitBtn) return
  submitBtn.addEventListener('click', handleCreateTechnician)
}

async function handleCreateTechnician() {
  const name = document.getElementById('tech-name').value.trim()
  const specialty = document.getElementById('tech-specialty').value
  const email = document.getElementById('tech-email').value.trim()
  const password = document.getElementById('tech-password').value
  const submitBtn = document.getElementById('modal-create-technician-submit')

  if (!name || !specialty || !email || !password) {
    showToast('Please fill in all fields.', 'error')
    return
  }
  if (password.length < 6) {
    showToast('Password must be at least 6 characters.', 'error')
    return
  }

  submitBtn.textContent = 'Creating...'
  submitBtn.disabled = true

  try {
    const { error } = await supabase
      .from('technicians')
      .insert({ email, full_name: name, specialty, password })

    if (error) {
      if (error.code === '23505') {
        showToast('A technician with this email already exists.', 'error')
      } else {
        throw error
      }
      return
    }

    showToast(`Technician "${name}" added successfully!`, 'success')
    closeModal('modal-create-technician')
    await loadTechnicians()

    document.getElementById('tech-name').value = ''
    document.getElementById('tech-specialty').value = ''
    document.getElementById('tech-email').value = ''
    document.getElementById('tech-password').value = ''
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    submitBtn.textContent = 'Add Technician'
    submitBtn.disabled = false
  }
}

/* =====================================================================
   TABLE ACTION BUTTONS
   ===================================================================== */

let selectedIssueId = null

function initTableActions() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.table-action-btn')
    if (!btn) return

    const action = btn.dataset.action
    if (action === 'assign') {
      selectedIssueId = btn.dataset.issue
      const issueDisplay = document.getElementById('assign-issue-display')
      if (issueDisplay) {
        issueDisplay.value = btn.dataset.title || 'Issue'
      }
      // Load technicians into dropdown
      loadAssignTechDropdown()
      openModal('modal-assign-tech')
    }
  })
}

async function loadAssignTechDropdown() {
  const select = document.getElementById('assign-tech-select')
  if (!select) return

  const { data: techs } = await supabase
    .from('technicians')
    .select('email, full_name')
    .order('full_name', { ascending: true })

  if (!techs || techs.length === 0) {
    select.innerHTML = '<option value="">-- No technicians available --</option>'
    return
  }

  select.innerHTML = '<option value="">-- Select a technician --</option>'
    + techs.map(t =>
      `<option value="${t.email}">${t.full_name} (${t.email})</option>`
    ).join('')
}

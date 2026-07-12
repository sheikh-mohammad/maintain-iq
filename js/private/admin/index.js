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
  initSearch()
  initCreateTechnician()
  initCreateAsset()
  loadTechnicians()
  loadAssets()
  loadIssues()
  loadMaintenanceRecords()
  loadDashboardStats()
  loadAnalytics()
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
      const overlay = document.getElementById('sidebar-overlay')
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open')
        if (overlay) overlay.classList.remove('active')
        document.body.style.overflow = ''
      }
    })
  })
}

/* --- Sidebar Toggle --- */
function initSidebarToggle() {
  const toggleBtn = document.getElementById('mobile-sidebar-toggle')
  const collapseBtn = document.getElementById('sidebar-collapse')
  const sidebar = document.getElementById('admin-sidebar')
  const overlay = document.getElementById('sidebar-overlay')
  if (!sidebar) return

  function openSidebar() {
    sidebar.classList.add('open')
    if (overlay) overlay.classList.add('active')
    document.body.style.overflow = 'hidden'
  }

  function closeSidebar() {
    sidebar.classList.remove('open')
    if (overlay) overlay.classList.remove('active')
    document.body.style.overflow = ''
  }

  // Mobile: show/hide sidebar
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (sidebar.classList.contains('open')) {
        closeSidebar()
      } else {
        openSidebar()
      }
    })
  }

  // Desktop: expand/collapse; Mobile: close sidebar
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeSidebar()
      } else {
        sidebar.classList.toggle('collapsed')
      }
    })
  }

  // Overlay click closes sidebar
  if (overlay) {
    overlay.addEventListener('click', closeSidebar)
  }

  // ESC key closes sidebar on mobile
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && window.innerWidth <= 768 && sidebar.classList.contains('open')) {
      closeSidebar()
    }
  })

  // Cleanup body overflow on resize from mobile to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && sidebar.classList.contains('open')) {
      closeSidebar()
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
        <select class="admin-status-select" data-code="${a.assetCode}" data-name="${a.name}" data-current="${a.status}">
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
      const assetName = select.dataset.name
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
          asset_name: assetName,
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
    const isCritical = issue.priority === 'Critical'

    const statusClass = issue.status === 'Reported' ? 'badge-orange'
      : issue.status === 'Assigned' ? 'badge-blue'
      : issue.status === 'Inspection Started' ? 'badge-blue'
      : issue.status === 'Maintenance In Progress' ? 'badge-purple'
      : issue.status === 'Waiting for Parts' ? 'badge-orange'
      : issue.status === 'Resolved' ? 'badge-emerald'
      : issue.status === 'Closed' ? 'badge-gray'
      : 'badge-purple'

    // Critical treatment: red badge with pulse, alert icon
    const priorityClass = isCritical ? 'badge-critical'
      : issue.priority === 'High' ? 'badge-orange'
      : issue.priority === 'Medium' ? 'badge-blue'
      : 'badge-emerald'

    const priorityIcon = isCritical
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V8h2v4z"/></svg> '
      : ''

    const assignedDisplay = issue.technician_email || '—'

    // Actions column
    let actionsHtml = ''
    if (issue.status === 'Reported') {
      actionsHtml = `<button class="table-action-btn" data-action="assign" data-issue="${issue.id}" data-title="${issue.title}">Assign</button>`
    } else if (issue.status === 'Resolved') {
      actionsHtml = `
        <button class="table-action-btn" data-action="close" data-issue="${issue.id}" style="border-color:var(--border-light);color:var(--text-gray-400);">Close</button>
        <button class="table-action-btn" data-action="reopen" data-issue="${issue.id}" style="border-color:var(--accent-blue-border);color:var(--accent-blue);">Reopen</button>
      `
    } else if (issue.status === 'Closed') {
      actionsHtml = `<button class="table-action-btn" data-action="reopen" data-issue="${issue.id}" style="border-color:var(--accent-blue-border);color:var(--accent-blue);">Reopen</button>`
    } else {
      actionsHtml = `<span class="badge ${statusClass}">${issue.status}</span>`
    }

    return `
      <tr${isCritical ? ' class="critical-row"' : ''}>
        <td>${issue.title}</td>
        <td>${issue.assetId}</td>
        <td><span class="badge ${priorityClass}">${priorityIcon}${issue.priority}</span></td>
        <td><span class="badge ${statusClass}">${issue.status}</span></td>
        <td>${assignedDisplay}</td>
        <td>${actionsHtml}</td>
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
        <div class="maintenance-detail-grid">
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

  // Count open issues (not Closed)
  const { count: openIssues } = await supabase
    .from('issues')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'Closed')

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
   ANALYTICS CHARTS
   ===================================================================== */

// Track chart instances so we can destroy them before re-creating
let chartAssetCategory = null
let chartIssueStatus = null
let chartIssuesTime = null
let chartPriority = null

async function loadAnalytics() {
  const section = document.getElementById('analytics-section')
  if (!section) return

  // Show loading states
  showAnalyticsLoading('asset-category')
  showAnalyticsLoading('issue-status')
  showAnalyticsLoading('issues-time')
  showAnalyticsLoading('priority')

  try {
    // Fetch data in parallel
    const [assetResult, issueResult] = await Promise.all([
      supabase.from('assets').select('category, status'),
      supabase.from('issues').select('status, priority, created_at'),
    ])

    const assets = assetResult.data || []
    const issues = issueResult.data || []

    // If there's any data, hide the big empty-state message
    const emptyState = document.getElementById('dashboard-empty-state')
    if (assets.length > 0 || issues.length > 0) {
      if (emptyState) emptyState.classList.add('hidden')
    }

    // --- 1. Assets by Category (Doughnut) ---
    if (assets.length > 0) {
      const categoryCounts = {}
      assets.forEach(a => {
        const cat = a.category || 'Uncategorized'
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
      })
      renderDoughnutChart('chart-asset-category', 'asset-category',
        Object.keys(categoryCounts), Object.values(categoryCounts),
        getCategoryColors(Object.keys(categoryCounts))
      )
    } else {
      showAnalyticsEmpty('asset-category')
    }

    // --- 2. Issue Status Overview (Doughnut) ---
    if (issues.length > 0) {
      const statusCounts = {}
      const statusColors = {
        Reported: '#fb923c',
        Assigned: '#3b82f6',
        'Inspection Started': '#06b6d4',
        'Maintenance In Progress': '#8b5cf6',
        'Waiting for Parts': '#f59e0b',
        Resolved: '#10b981',
        Closed: '#a1a1aa',
        Reopened: '#f59e0b',
      }
      issues.forEach(i => {
        const s = i.status || 'Reported'
        statusCounts[s] = (statusCounts[s] || 0) + 1
      })
      const labels = Object.keys(statusCounts).filter(k => statusCounts[k] > 0)
      const values = labels.map(l => statusCounts[l])
      const colors = labels.map(l => statusColors[l] || '#a1a1aa')
      renderDoughnutChart('chart-issue-status', 'issue-status',
        labels, values, colors
      )
    } else {
      showAnalyticsEmpty('issue-status')
    }

    // --- 3. Issues Over Time (Bar — last 6 months) ---
    if (issues.length > 0) {
      const now = new Date()
      const monthLabels = []
      const monthCounts = []

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        monthLabels.push(label)
        monthCounts.push(0)
      }

      issues.forEach(i => {
        if (!i.created_at) return
        const d = new Date(i.created_at)
        const m = d.getMonth()
        const y = d.getFullYear()
        for (let j = 0; j < 6; j++) {
          const base = new Date(now.getFullYear(), now.getMonth() - (5 - j), 1)
          if (base.getMonth() === m && base.getFullYear() === y) {
            monthCounts[j]++
            break
          }
        }
      })

      renderBarChart('chart-issues-time', 'issues-time',
        monthLabels, monthCounts,
        getComputedStyleVal('--accent-emerald') || '#10b981'
      )
    } else {
      showAnalyticsEmpty('issues-time')
    }

    // --- 4. Priority Breakdown (Bar) ---
    if (issues.length > 0) {
      const priorityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 }
      issues.forEach(i => {
        const p = i.priority || 'Low'
        priorityCounts[p] = (priorityCounts[p] || 0) + 1
      })
      const labels = Object.keys(priorityCounts).filter(k => priorityCounts[k] > 0)
      const values = labels.map(l => priorityCounts[l])
      const colors = labels.map(l =>
        l === 'Critical' ? '#ef4444'
        : l === 'High' ? '#fb923c'
        : l === 'Medium' ? '#3b82f6'
        : '#10b981'
      )
      renderBarChart('chart-priority', 'priority',
        labels, values, colors
      )
    } else {
      showAnalyticsEmpty('priority')
    }

  } catch (err) {
    console.error('Analytics error:', err)
    // On error, show empty states for all charts
    ;['asset-category', 'issue-status', 'issues-time', 'priority'].forEach(id => {
      showAnalyticsEmpty(id)
    })
  }
}

/* --- Chart render helpers --- */

function renderDoughnutChart(canvasId, loadingId, labels, data, colors) {
  hideAnalyticsLoading(loadingId)
  const canvas = document.getElementById(canvasId)
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const textColor = getComputedStyleVal('--text-gray-400') || '#a1a1aa'
  const borderColor = getComputedStyleVal('--bg-secondary') || '#1a1a2e'

  // Destroy previous instance
  if (canvasId === 'chart-asset-category' && chartAssetCategory) chartAssetCategory.destroy()
  if (canvasId === 'chart-issue-status' && chartIssueStatus) chartIssueStatus.destroy()

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: borderColor,
        borderWidth: 2,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor,
            padding: 12,
            font: { size: 11 },
            boxWidth: 12,
            boxHeight: 12,
          },
        },
        tooltip: {
          backgroundColor: getComputedStyleVal('--bg-tertiary') || '#16213e',
          titleColor: getComputedStyleVal('--text-white') || '#fff',
          bodyColor: getComputedStyleVal('--text-gray-300') || '#d1d5db',
          borderColor: getComputedStyleVal('--border-light') || '#2a2a4a',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0)
              const pct = total > 0 ? Math.round((context.parsed / total) * 100) : 0
              return ` ${context.label}: ${context.parsed} (${pct}%)`
            },
          },
        },
      },
      cutout: '65%',
    },
  })

  if (canvasId === 'chart-asset-category') chartAssetCategory = chart
  if (canvasId === 'chart-issue-status') chartIssueStatus = chart
}

function renderBarChart(canvasId, loadingId, labels, data, colors) {
  hideAnalyticsLoading(loadingId)
  const canvas = document.getElementById(canvasId)
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const textColor = getComputedStyleVal('--text-gray-400') || '#a1a1aa'
  const gridColor = getComputedStyleVal('--border-subtle') || '#1e1e3a'

  // Destroy previous instance
  if (canvasId === 'chart-issues-time' && chartIssuesTime) chartIssuesTime.destroy()
  if (canvasId === 'chart-priority' && chartPriority) chartPriority.destroy()

  const isSingleColor = typeof colors === 'string'
  const bgColors = isSingleColor
    ? labels.map(() => colors + '33')  // add 20% alpha
    : colors.map(c => c + '33')
  const borderColors = isSingleColor
    ? labels.map(() => colors)
    : colors

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 2,
        borderRadius: 4,
        maxBarThickness: 48,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: getComputedStyleVal('--bg-tertiary') || '#16213e',
          titleColor: getComputedStyleVal('--text-white') || '#fff',
          bodyColor: getComputedStyleVal('--text-gray-300') || '#d1d5db',
          borderColor: getComputedStyleVal('--border-light') || '#2a2a4a',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 10 } },
          grid: { color: gridColor, drawBorder: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: textColor,
            font: { size: 10 },
            stepSize: 1,
          },
          grid: { color: gridColor, drawBorder: false },
        },
      },
    },
  })

  if (canvasId === 'chart-issues-time') chartIssuesTime = chart
  if (canvasId === 'chart-priority') chartPriority = chart
}

/* --- Loading / Empty state helpers --- */

function showAnalyticsLoading(id) {
  const loading = document.getElementById(`loading-${id}`)
  const empty = document.getElementById(`empty-${id}`)
  if (loading) loading.classList.add('active')
  if (empty) empty.classList.remove('active')
}

function hideAnalyticsLoading(id) {
  const loading = document.getElementById(`loading-${id}`)
  if (loading) loading.classList.remove('active')
}

function showAnalyticsEmpty(id) {
  const loading = document.getElementById(`loading-${id}`)
  const empty = document.getElementById(`empty-${id}`)
  if (loading) loading.classList.remove('active')
  if (empty) empty.classList.add('active')
}

/* --- Utility: read a CSS custom property value --- */

function getComputedStyleVal(name) {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || null
  } catch {
    return null
  }
}

/* --- Utility: pick distinct colors for category doughnut --- */

function getCategoryColors(categories) {
  const palette = [
    '#10b981', '#3b82f6', '#fb923c', '#8b5cf6',
    '#ef4444', '#f59e0b', '#06b6d4', '#ec4899',
    '#14b8a6', '#6366f1', '#f97316', '#84cc16',
  ]
  return categories.map((_, i) => palette[i % palette.length])
}

/* =====================================================================
   HISTORY LOG
   ===================================================================== */

async function loadHistoryLog() {
  const timeline = document.getElementById('history-timeline')
  if (!timeline) return

  // Fetch history entries
  const { data: logEntries } = await supabase
    .from('history_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch assets for name enrichment
  const { data: assets } = await supabase
    .from('assets')
    .select('assetCode, name')

  const assetMap = {}
  if (assets) {
    assets.forEach(a => { assetMap[a.assetCode] = a })
  }

  // Fetch issues for title enrichment
  const { data: issues } = await supabase
    .from('issues')
    .select('id, title, assetId')

  const issueMap = {}
  if (issues) {
    issues.forEach(i => { issueMap[i.id] = i })
  }

  const events = []

  if (logEntries && logEntries.length > 0) {
    logEntries.forEach(e => {
      // Resolve asset info: directly or via issue lookup
      const issue = e.issue_id ? issueMap[e.issue_id] : null
      const resolvedAssetCode = e.asset_code || (issue ? issue.assetId : null)
      const asset = resolvedAssetCode ? assetMap[resolvedAssetCode] : null
      const assetName = e.asset_name || (asset ? asset.name : null)

      events.push({
        id: e.id,
        date: e.created_at,
        action: e.action,
        actor: e.actor,
        detail: e.detail,
        assetName,
        assetCode: resolvedAssetCode,
        issueTitle: issue?.title || null,
        type: e.action === 'Asset Created' ? 'create'
          : e.action === 'Issue Reported' ? 'issue'
          : e.action === 'Issue Resolved' ? 'resolve'
          : e.action === 'Issue Closed' ? 'close'
          : e.action === 'Issue Reopened' ? 'reopen'
          : 'update',
      })
    })
  }

  // Also pull from maintenance_records as fallback
  const { data: records } = await supabase
    .from('maintenance_records')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (records && records.length > 0) {
    const historyIssueIds = new Set(
      events.filter(e => e.action.includes('Maintenance') || e.action === 'Issue Resolved').map(e => e.id)
    )

    records.forEach(r => {
      const asset = r.asset_id ? assetMap[r.asset_id] : null
      events.push({
        id: `mr-${r.id}`,
        date: r.created_at,
        action: r.status === 'Completed' ? 'Issue Resolved' : 'Maintenance Updated',
        actor: r.technician_email,
        detail: r.status === 'Completed'
          ? `Resolved — Cost: $${r.cost}`
          : `${r.status} — ${(r.actions_taken || '').substring(0, 80)}`,
        assetName: asset?.name || null,
        assetCode: r.asset_id,
        issueTitle: null,
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

  function esc(str) {
    const d = document.createElement('div')
    d.textContent = str
    return d.innerHTML
  }

  timeline.innerHTML = unique.map(e => {
    const dotClass = e.type === 'create' ? 'dot-create'
      : e.type === 'issue' ? 'dot-issue'
      : e.type === 'resolve' ? 'dot-resolve'
      : e.type === 'close' ? 'dot-close'
      : e.type === 'reopen' ? 'dot-reopen'
      : 'dot-update'

    // Format detail — highlight old → new transitions
    let detailHtml = esc(e.detail || '')
    const arrow = '→'
    if (detailHtml.includes(arrow)) {
      const parts = detailHtml.split(arrow)
      if (parts.length === 2) {
        detailHtml = '<span class="history-change-old">' + parts[0].trim() + '</span><span class="history-change-arrow"> ' + arrow + ' </span><span class="history-change-new">' + parts[1].trim() + '</span>'
      }
    }

    const assetDisplay = e.assetName
      ? '<div class="history-entry-asset"><span class="history-asset-tag">' + esc(e.assetName) + (e.assetCode ? ' <span class="history-asset-code">#' + e.assetCode + '</span>' : '') + '</span></div>'
      : ''

    const issueDisplay = e.issueTitle
      ? '<div class="history-entry-issue-ref">Issue: <strong>' + esc(e.issueTitle) + '</strong></div>'
      : ''

    return '<div class="history-entry" style="display:block;">' +
      '<div class="history-entry-dot ' + dotClass + '"></div>' +
      '<div class="history-entry-content">' +
        '<div class="history-entry-header">' +
          '<span class="history-entry-action">' + esc(e.action) + '</span>' +
          '<span class="history-entry-date">' + new Date(e.date).toLocaleString() + '</span>' +
        '</div>' +
        assetDisplay +
        '<div class="history-entry-details">' + detailHtml + '</div>' +
        issueDisplay +
        '<div class="history-entry-actor">by <strong>' + esc(e.actor) + '</strong></div>' +
      '</div></div>'
  }).join('')
}


/* --- Table Search / Filter --- */

function initSearch() {
  const searches = [
    { input: 'asset-search', tbody: 'assets-table-body', colspan: 7 },
    { input: 'issue-search', tbody: 'issues-table-body', colspan: 6 },
    { input: 'tech-search', tbody: 'technicians-table-body', colspan: 5 },
    { input: 'maintenance-search', tbody: 'maintenance-table-body', colspan: 7 },
  ]

  searches.forEach(({ input: inputId, tbody: tbodyId, colspan }) => {
    const input = document.getElementById(inputId)
    const tbody = document.getElementById(tbodyId)
    if (!input || !tbody) return

    input.addEventListener('input', () => {
      const term = input.value.trim().toLowerCase()
      const rows = Array.from(tbody.querySelectorAll('tr'))

      // Remove any previous "no results" row
      const prevEmpty = tbody.querySelector('tr.empty-search-result')
      if (prevEmpty) prevEmpty.remove()

      if (!term) {
        rows.forEach(row => { row.style.display = '' })
        return
      }

      let visibleCount = 0

      rows.forEach(row => {
        // Skip the default empty-state row (has colspan)
        if (row.querySelector('td[colspan]')) {
          row.style.display = 'none'
          return
        }
        const text = row.textContent.toLowerCase()
        if (text.includes(term)) {
          row.style.display = ''
          visibleCount++
        } else {
          row.style.display = 'none'
        }
      })

      if (visibleCount === 0) {
        const emptyRow = document.createElement('tr')
        emptyRow.className = 'empty-search-result'
        emptyRow.innerHTML = '<td colspan="' + colspan + '" class="table-empty">No results found for "<strong>' + input.value + '</strong>".</td>'
        tbody.appendChild(emptyRow)
      }
    })
  })
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
    } else if (action === 'close') {
      const issueId = btn.dataset.issue
      handleCloseIssue(issueId)
    } else if (action === 'reopen') {
      const issueId = btn.dataset.issue
      handleReopenIssue(issueId)
    }
  })
}

/* --- Custom confirmation modal (replaces native confirm) --- */

function showConfirmModal(message) {
  return new Promise(resolve => {
    const overlay = document.getElementById('modal-confirm')
    const msgEl = document.getElementById('modal-confirm-message')
    const okBtn = document.getElementById('modal-confirm-ok')
    const cancelBtn = document.getElementById('modal-confirm-cancel')
    if (!overlay || !msgEl) { resolve(false); return }

    msgEl.textContent = message
    overlay.classList.add('open')
    document.body.style.overflow = 'hidden'

    function cleanup(result) {
      overlay.classList.remove('open')
      document.body.style.overflow = ''
      okBtn.removeEventListener('click', onOk)
      cancelBtn.removeEventListener('click', onCancel)
      overlay.removeEventListener('click', onBackdrop)
      document.querySelectorAll('[data-modal="modal-confirm"]').forEach(el => {
        el.removeEventListener('click', onCancel)
      })
      resolve(result)
    }

    function onOk() { cleanup(true) }
    function onCancel() { cleanup(false) }
    function onBackdrop(e) {
      if (e.target === overlay) cleanup(false)
    }

    okBtn.addEventListener('click', onOk)
    cancelBtn.addEventListener('click', onCancel)
    overlay.addEventListener('click', onBackdrop)
    document.querySelectorAll('[data-modal="modal-confirm"]').forEach(el => {
      el.addEventListener('click', onCancel)
    })
  })
}

async function handleCloseIssue(issueId) {
  const confirmed = await showConfirmModal('Close this issue? It will no longer be editable until reopened.')
  if (!confirmed) return

  try {
    const { error } = await supabase
      .from('issues')
      .update({ status: 'Closed', closed_at: new Date().toISOString() })
      .eq('id', issueId)

    if (error) throw error

    // Log history
    createHistoryLog({
      action: 'Issue Closed',
      actor: 'admin@admin.com',
      detail: `Issue #${issueId} closed`,
      issue_id: parseInt(issueId),
    })

    showToast('Issue closed successfully.', 'success')
    await loadIssues()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

async function handleReopenIssue(issueId) {
  const confirmed = await showConfirmModal('Reopen this issue? It will be set back to "Assigned" status.')
  if (!confirmed) return

  try {
    // First get current issue to know the reopened count
    const { data: issue } = await supabase
      .from('issues')
      .select('reopened_count')
      .eq('id', issueId)
      .single()

    const reopenedCount = (issue?.reopened_count || 0) + 1

    const { error } = await supabase
      .from('issues')
      .update({
        status: 'Assigned',
        reopened_at: new Date().toISOString(),
        reopened_count: reopenedCount,
        closed_at: null,
      })
      .eq('id', issueId)

    if (error) throw error

    // Log history
    createHistoryLog({
      action: 'Issue Reopened',
      actor: 'admin@admin.com',
      detail: `Issue #${issueId} reopened (reopened ${reopenedCount} time(s))`,
      issue_id: parseInt(issueId),
    })

    showToast('Issue reopened successfully.', 'success')
    await loadIssues()
  } catch (err) {
    showToast(err.message, 'error')
  }
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

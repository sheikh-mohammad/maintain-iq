/* ==========================================================================
   MaintainIQ - Technician Dashboard Script
   ========================================================================== */

import { showToast, supabase, createHistoryLog } from '../../auth/auth.js'

const TECH_SESSION_KEY = 'maintainiq-tech-session'

document.addEventListener('DOMContentLoaded', () => {
  // Check session
  const raw = localStorage.getItem(TECH_SESSION_KEY)
  if (!raw) {
    window.location.href = '/pages/auth/login.html'
    return
  }

  let tech
  try {
    tech = JSON.parse(raw)
  } catch {
    localStorage.removeItem(TECH_SESSION_KEY)
    window.location.href = '/pages/auth/login.html'
    return
  }

  // Greet
  const nameEl = document.getElementById('tech-name')
  if (nameEl) nameEl.textContent = tech.name || tech.email || 'Technician'

  // Init
  initSidebarNavigation()
  initSidebarToggle()
  initLogout()
  loadTechIssues()
  loadTechAssets()
  loadMaintenanceDropdown()
  initMaintenanceForm()
})

/* --- Sidebar Navigation --- */

function initSidebarNavigation() {
  const links = document.querySelectorAll('.tech-sidebar-link[data-page]')
  const pages = document.querySelectorAll('.tech-page')
  const pageTitle = document.getElementById('tech-page-title')

  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault()

      links.forEach(l => l.classList.remove('active'))
      link.classList.add('active')

      const pageId = link.dataset.page
      pages.forEach(p => p.classList.remove('active'))

      const target = document.getElementById(`tech-page-${pageId}`)
      if (target) {
        target.classList.add('active')
        if (pageTitle) pageTitle.textContent = link.querySelector('span').textContent
      }

      // Lazy load assets data when navigating to assets page
      if (pageId === 'assets') {
        loadTechAssets()
      }

      // Close sidebar on mobile
      const sidebar = document.getElementById('tech-sidebar')
      const overlay = document.getElementById('tech-sidebar-overlay')
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open')
        if (overlay) overlay.classList.remove('active')
        document.body.style.overflow = ''
      }
    })
  })
}

/* --- Sidebar Toggle (mobile) --- */

function initSidebarToggle() {
  const toggleBtn = document.getElementById('tech-mobile-toggle')
  const collapseBtn = document.getElementById('tech-sidebar-collapse')
  const sidebar = document.getElementById('tech-sidebar')
  const overlay = document.getElementById('tech-sidebar-overlay')
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

  // Cleanup on resize from mobile to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && sidebar.classList.contains('open')) {
      closeSidebar()
    }
  })
}

/* --- Load Issues --- */

async function loadTechIssues() {
  const tbody = document.getElementById('tech-issues-body')
  if (!tbody) return

  // Get logged-in technician's email
  const raw = localStorage.getItem(TECH_SESSION_KEY)
  let techEmail = ''
  try {
    const s = JSON.parse(raw)
    techEmail = s.email || ''
  } catch { /* ignore */ }

  if (!techEmail) {
    tbody.innerHTML = `<tr><td colspan="5" class="tech-table-empty">Could not identify your account.</td></tr>`
    return
  }

  // Only show issues assigned to this technician
  const { data: issues } = await supabase
    .from('issues')
    .select('*')
    .eq('technician_email', techEmail)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!issues || issues.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="tech-table-empty">No issues assigned to you yet.</td></tr>`
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

    return `
      <tr>
        <td>${issue.title}</td>
        <td>${issue.assetId}</td>
        <td><span class="badge ${priorityClass}">${issue.priority}</span></td>
        <td><span class="badge ${statusClass}">${issue.status}</span></td>
        <td>—</td>
      </tr>
    `
  }).join('')
}

/* --- Load Assets --- */

async function loadTechAssets() {
  const tbody = document.getElementById('tech-assets-body')
  if (!tbody) return

  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false })

  if (!assets || assets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="tech-table-empty">No assets found.</td></tr>`
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

    return `
    <tr>
      <td>${a.name}</td>
      <td>${a.assetCode}</td>
      <td>${a.category || '—'}</td>
      <td>${a.location || '—'}</td>
      <td><span class="badge ${statusClass}">${a.status}</span></td>
    </tr>`
  }).join('')
}

/* --- Maintenance Form --- */

async function loadMaintenanceDropdown() {
  const select = document.getElementById('maintenance-issue-select')
  if (!select) return

  const raw = localStorage.getItem(TECH_SESSION_KEY)
  let techEmail = ''
  try {
    const s = JSON.parse(raw)
    techEmail = s.email || ''
  } catch { /* ignore */ }

  if (!techEmail) return

  const { data: issues } = await supabase
    .from('issues')
    .select('id, title, assetId, status')
    .eq('technician_email', techEmail)
    .order('created_at', { ascending: false })

  if (!issues || issues.length === 0) return

  select.innerHTML = '<option value="">-- Select an issue --</option>'
    + issues.map(i =>
      `<option value="${i.id}">#${i.assetId} - ${i.title} (${i.status})</option>`
    ).join('')
}

function initMaintenanceForm() {
  const select = document.getElementById('maintenance-issue-select')
  const submitBtn = document.getElementById('btn-save-maintenance')
  if (!select || !submitBtn) return

  select.addEventListener('change', () => {
    submitBtn.disabled = !select.value
  })

  submitBtn.addEventListener('click', handleSaveMaintenance)
}

async function handleSaveMaintenance() {
  const issueId = document.getElementById('maintenance-issue-select').value
  const notes = document.getElementById('maintenance-notes').value.trim()
  const workDone = document.getElementById('maintenance-work').value.trim()
  const cost = parseFloat(document.getElementById('maintenance-cost').value) || 0
  const status = document.getElementById('maintenance-status').value
  const fileInput = document.getElementById('maintenance-evidence')
  const submitBtn = document.getElementById('btn-save-maintenance')

  if (!issueId) {
    showToast('Please select an issue.', 'error')
    return
  }

  if (!workDone) {
    showToast('Please describe the work performed.', 'error')
    return
  }

  submitBtn.textContent = 'Saving...'
  submitBtn.disabled = true

  try {
    // Get logged-in tech info
    const raw = localStorage.getItem(TECH_SESSION_KEY)
    let techEmail = '', techName = ''
    try {
      const s = JSON.parse(raw)
      techEmail = s.email || ''
      techName = s.name || ''
    } catch { /* ignore */ }

    // Get the issue details to find the assetId
    const { data: issue } = await supabase
      .from('issues')
      .select('assetId')
      .eq('id', issueId)
      .single()

    if (!issue) throw new Error('Issue not found')

    // Upload evidence image if provided
    let evidenceUrl = ''
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `evidence/${issueId}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('maintenance-evidence')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('maintenance-evidence')
        .getPublicUrl(fileName)

      evidenceUrl = publicUrl
    }

    // Insert maintenance record
    const { error: insertError } = await supabase
      .from('maintenance_records')
      .insert({
        issue_id: parseInt(issueId),
        asset_id: issue.assetId,
        technician_email: techEmail,
        diagnosis: notes,
        actions_taken: workDone,
        cost: cost,
        status: status === 'Resolved' ? 'Completed' : 'In Progress',
        notes: notes,
        evidence_url: evidenceUrl,
        completed_at: status === 'Resolved' ? new Date().toISOString() : null,
      })

    if (insertError) throw insertError

    // Update the issue status
    const { error: updateError } = await supabase
      .from('issues')
      .update({ status: status })
      .eq('id', issueId)

    if (updateError) throw updateError

    // Update asset status when resolved
    if (status === 'Resolved') {
      await supabase
        .from('assets')
        .update({ status: 'Operational' })
        .eq('assetCode', issue.assetId)
    } else if (status === 'Inspection Started') {
      await supabase
        .from('assets')
        .update({ status: 'Under Inspection' })
        .eq('assetCode', issue.assetId)
    } else if (status === 'Maintenance In Progress' || status === 'Waiting for Parts') {
      await supabase
        .from('assets')
        .update({ status: 'Under Maintenance' })
        .eq('assetCode', issue.assetId)
    }

    // Log history
    createHistoryLog({
      asset_code: issue.assetId,
      action: status === 'Resolved' ? 'Issue Resolved' : 'Maintenance Updated',
      actor: techEmail,
      detail: status === 'Resolved'
        ? `Resolved — Cost: $${cost}`
        : `${status} — ${workDone.substring(0, 80)}`,
      issue_id: parseInt(issueId),
    })

    showToast('Maintenance record saved successfully!', 'success')

    // Reset form
    document.getElementById('maintenance-notes').value = ''
    document.getElementById('maintenance-work').value = ''
    document.getElementById('maintenance-cost').value = ''
    document.getElementById('maintenance-status').selectedIndex = 0
    document.getElementById('maintenance-evidence').value = ''
    document.getElementById('maintenance-issue-select').value = ''
    submitBtn.disabled = true

    // Reload data
    await loadTechIssues()
    await loadMaintenanceDropdown()
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    submitBtn.textContent = 'Save Maintenance Record'
    submitBtn.disabled = false
  }
}

/* --- Logout --- */

function initLogout() {
  const logoutBtn = document.getElementById('tech-logout-btn')
  if (!logoutBtn) return

  logoutBtn.addEventListener('click', e => {
    e.preventDefault()
    localStorage.removeItem(TECH_SESSION_KEY)
    showToast('Logged out successfully.', 'success')
    setTimeout(() => {
      window.location.href = '/'
    }, 200)
  })
}

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
    const isCritical = issue.priority === 'Critical'

    // Priority badge — critical gets special pulse class
    const priorityClass = isCritical ? 'badge-critical'
      : issue.priority === 'High' ? 'badge-orange'
      : issue.priority === 'Medium' ? 'badge-blue'
      : 'badge-emerald'

    const priorityIcon = isCritical
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V8h2v4z"/></svg>'
      : ''

    const statusClass = issue.status === 'Reported' ? 'badge-orange'
      : issue.status === 'Assigned' ? 'badge-blue'
      : issue.status === 'Inspection Started' ? 'badge-blue'
      : issue.status === 'Maintenance In Progress' ? 'badge-purple'
      : issue.status === 'Waiting for Parts' ? 'badge-orange'
      : issue.status === 'Resolved' ? 'badge-emerald'
      : issue.status === 'Closed' ? 'badge-gray'
      : 'badge-purple'

    // Actions column: show button for open issues, nothing for closed/resolved
    const openStatuses = ['Reported', 'Assigned', 'Inspection Started', 'Maintenance In Progress', 'Waiting for Parts']
    const actionsHtml = openStatuses.includes(issue.status)
      ? `<button class="tech-action-btn" data-issue-id="${issue.id}" data-issue-title="${issue.title}">Perform Maintenance</button>`
      : '—'

    return `
      <tr${isCritical ? ' class="critical-row"' : ''}>
        <td>${issue.title}</td>
        <td>${issue.assetId}</td>
        <td><span class="badge ${priorityClass}">${priorityIcon}${issue.priority}</span></td>
        <td><span class="badge ${statusClass}">${issue.status}</span></td>
        <td>${actionsHtml}</td>
      </tr>
    `
  }).join('')

  // Attach "Perform Maintenance" click handlers — navigate to maintenance page
  tbody.querySelectorAll('.tech-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const select = document.getElementById('maintenance-issue-select')
      if (select) {
        // Set the dropdown value and navigate to maintenance tab
        select.value = btn.dataset.issueId
        // Trigger change event to enable the submit button
        const evt = new Event('change')
        select.dispatchEvent(evt)

        // Navigate to the maintenance page
        const link = document.querySelector('.tech-sidebar-link[data-page="maintenance"]')
        if (link) link.click()
      }
    })
  })
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
    .not('status', 'in', '("Closed","Resolved")')
    .order('created_at', { ascending: false })

  if (!issues || issues.length === 0) {
    select.innerHTML = '<option value="">-- No open issues available --</option>'
    return
  }

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
  const cost = parseFloat(document.getElementById('maintenance-cost').value)
  const status = document.getElementById('maintenance-status').value
  const nextServiceDate = document.getElementById('maintenance-next-service').value || null
  const fileInput = document.getElementById('maintenance-evidence')
  const submitBtn = document.getElementById('btn-save-maintenance')

  if (!issueId) {
    showToast('Please select an issue.', 'error')
    return
  }

  // Cost validation: must be non-negative
  if (isNaN(cost) || cost < 0) {
    showToast('Maintenance cost cannot be negative.', 'error')
    return
  }

  // Work done required when resolving
  if (status === 'Resolved' && !workDone) {
    showToast('Please describe the work performed before resolving.', 'error')
    return
  }

  if (!workDone) {
    showToast('Please describe the work performed.', 'error')
    return
  }

  // Next service date validation: cannot be before today when resolving
  if (status === 'Resolved' && nextServiceDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (new Date(nextServiceDate) < today) {
      showToast('Next service date cannot be before today.', 'error')
      return
    }
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

    // Get the issue details — verify ownership and get priority
    const { data: issue, error: issueFetchError } = await supabase
      .from('issues')
      .select('assetId, technician_email, priority, status')
      .eq('id', issueId)
      .single()

    if (issueFetchError || !issue) throw new Error('Issue not found')

    // Verify ownership: only the assigned technician can update
    if (issue.technician_email !== techEmail) {
      throw new Error('This issue is not assigned to you.')
    }

    // Verify issue is not closed
    if (issue.status === 'Closed') {
      throw new Error('This issue is closed and cannot be edited.')
    }

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
        cost: cost || 0,
        status: status === 'Resolved' ? 'Completed' : 'In Progress',
        notes: notes,
        evidence_url: evidenceUrl,
        completed_at: status === 'Resolved' ? new Date().toISOString() : null,
        next_service_date: nextServiceDate,
      })

    if (insertError) throw insertError

    // Update the issue status
    const { error: updateError } = await supabase
      .from('issues')
      .update({
        status: status,
        resolved_at: status === 'Resolved' ? new Date().toISOString() : null,
      })
      .eq('id', issueId)

    if (updateError) throw updateError

    // Update asset status based on maintenance status
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

    // Trigger "Out of Service" for critical issues
    if (issue.priority === 'Critical' &&
        ['Inspection Started', 'Maintenance In Progress', 'Waiting for Parts'].includes(status)) {
      await supabase
        .from('assets')
        .update({ status: 'Out of Service' })
        .eq('assetCode', issue.assetId)
    }

    // Log history
    createHistoryLog({
      asset_code: issue.assetId,
      action: status === 'Resolved' ? 'Issue Resolved' : 'Maintenance Updated',
      actor: techEmail,
      detail: status === 'Resolved'
        ? `Resolved — Cost: $${cost || 0}`
        : `${status} — ${workDone.substring(0, 80)}`,
      issue_id: parseInt(issueId),
    })

    showToast('Maintenance record saved successfully!', 'success')

    // Reset form
    document.getElementById('maintenance-notes').value = ''
    document.getElementById('maintenance-work').value = ''
    document.getElementById('maintenance-cost').value = ''
    document.getElementById('maintenance-next-service').value = ''
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

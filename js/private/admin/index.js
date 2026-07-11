/* ==========================================================================
   MaintainIQ - Admin Dashboard Script
   ========================================================================== */

import { requireAdmin, supabase, showToast } from '../../auth/auth.js'

document.addEventListener('DOMContentLoaded', async () => {
  const ok = await requireAdmin()
  if (!ok) return

  initSidebarNavigation()
  initSidebarToggle()
  initModals()
  initTableActions()
  initCreateTechnician()
  loadTechnicians()
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
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open')
      }
    })
  })
}

/* --- Sidebar Toggle (mobile) --- */
function initSidebarToggle() {
  const toggleBtn = document.getElementById('mobile-sidebar-toggle')
  const sidebar = document.getElementById('admin-sidebar')

  if (!toggleBtn || !sidebar) return

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open')
  })

  document.addEventListener('click', e => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
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
      }
    })
  })

  const submitAssetBtn = document.getElementById('modal-create-asset-submit')
  if (submitAssetBtn) {
    submitAssetBtn.addEventListener('click', () => {
      closeModal('modal-create-asset')
    })
  }

  const assignSubmitBtn = document.getElementById('modal-assign-tech-submit')
  if (assignSubmitBtn) {
    assignSubmitBtn.addEventListener('click', () => {
      closeModal('modal-assign-tech')
    })
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
    const { error: insertError } = await supabase
      .from('technicians')
      .insert({ email, full_name: name, specialty, password })

    if (insertError) {
      if (insertError.code === '23505') {
        showToast('A technician with this email already exists.', 'error')
      } else {
        throw insertError
      }
      return
    }

    showToast(`Technician "${name}" created successfully!`, 'success')
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

/* --- Table Action Buttons (placeholder) --- */
function initTableActions() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.table-action-btn')
    if (!btn) return

    const action = btn.dataset.action
    if (action === 'assign') {
      const assignModal = document.getElementById('modal-assign-tech')
      const issueDisplay = document.getElementById('assign-issue-display')
      if (assignModal && issueDisplay) {
        issueDisplay.value = btn.dataset.issue || 'Issue'
        openModal('modal-assign-tech')
      }
    }
  })
}

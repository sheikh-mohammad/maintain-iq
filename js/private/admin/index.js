/* ==========================================================================
   MaintainIQ - Admin Dashboard Script
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initSidebarNavigation();
  initSidebarToggle();
  initModals();
  initTableActions();
});

/* --- Sidebar Navigation --- */
function initSidebarNavigation() {
  const links = document.querySelectorAll('.sidebar-link[data-page]');
  const pages = document.querySelectorAll('.admin-page');
  const pageTitle = document.getElementById('page-title');

  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();

      links.forEach(l => l.classList.remove('active'));

      link.classList.add('active');

      const pageId = link.dataset.page;
      pages.forEach(p => p.classList.remove('active'));

      const target = document.getElementById(`page-${pageId}`);
      if (target) {
        target.classList.add('active');
        pageTitle.textContent = link.querySelector('span').textContent;
      }

      const sidebar = document.getElementById('admin-sidebar');
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
      }
    });
  });
}

/* --- Sidebar Toggle (mobile) --- */
function initSidebarToggle() {
  const toggleBtn = document.getElementById('mobile-sidebar-toggle');
  const sidebar = document.getElementById('admin-sidebar');

  if (!toggleBtn || !sidebar) return;

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  document.addEventListener('click', e => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });
}

/* --- Modals --- */
function initModals() {
  const openTriggers = {
    'btn-create-asset': 'modal-create-asset',
    'btn-create-technician': 'modal-create-technician',
  };

  Object.entries(openTriggers).forEach(([btnId, modalId]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => openModal(modalId));
  });

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      closeModal(modalId);
    });
  });

  document.querySelectorAll('.modal-footer .btn-secondary[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      closeModal(modalId);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });

  const submitAssetBtn = document.getElementById('modal-create-asset-submit');
  if (submitAssetBtn) {
    submitAssetBtn.addEventListener('click', () => {
      closeModal('modal-create-asset');
    });
  }

  const submitTechBtn = document.getElementById('modal-create-technician-submit');
  if (submitTechBtn) {
    submitTechBtn.addEventListener('click', () => {
      closeModal('modal-create-technician');
    });
  }

  const assignSubmitBtn = document.getElementById('modal-assign-tech-submit');
  if (assignSubmitBtn) {
    assignSubmitBtn.addEventListener('click', () => {
      closeModal('modal-assign-tech');
    });
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

/* --- Table Action Buttons (placeholder) --- */
function initTableActions() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.table-action-btn');
    if (!btn) return;

    const action = btn.dataset.action;
    if (action === 'assign') {
      const assignModal = document.getElementById('modal-assign-tech');
      const issueDisplay = document.getElementById('assign-issue-display');
      if (assignModal && issueDisplay) {
        issueDisplay.value = btn.dataset.issue || 'Issue';
        openModal('modal-assign-tech');
      }
    }
  });
}

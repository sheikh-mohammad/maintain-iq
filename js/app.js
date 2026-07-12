/* ==========================================================================
   MaintainIQ - Interactive UI Scripts (app.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initStickyNavbar();
  initMobileDrawer();
  initHeroPreviewHover();
  initDashboardMockupTabs();
  initStatsCounter();
  initPricingToggle();
  initSmoothScroll();
});

/* --- 1. Sticky Navbar Scroll Effect --- */
function initStickyNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const handleScroll = () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll);
  // Initial check in case page is loaded scrolled down
  handleScroll();
}

/* --- 2. Mobile Drawer Toggle --- */
function initMobileDrawer() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const closeBtn = document.getElementById('mobile-menu-close');
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('mobile-drawer-overlay');
  const drawerLinks = document.querySelectorAll('.mobile-drawer-link');
  if (!toggleBtn || !drawer || !overlay) return;

  const openDrawer = () => {
    drawer.classList.add('active');
    overlay.classList.add('active');
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  toggleBtn.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
  drawerLinks.forEach(link => { link.addEventListener('click', closeDrawer); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('active')) closeDrawer();
  });
}

/* --- 3. Hero Interactive Hover Effects --- */
function initHeroPreviewHover() {
  const previewWrapper = document.getElementById('hero-preview-wrapper');
  if (!previewWrapper) return;

  // Add interactive hover rotation effect following mouse slightly
  previewWrapper.addEventListener('mousemove', (e) => {
    const rect = previewWrapper.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Convert coordinate offsets to degree rotations
    const rotateX = -y / 15;
    const rotateY = x / 15;
    
    previewWrapper.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  previewWrapper.addEventListener('mouseleave', () => {
    previewWrapper.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    previewWrapper.style.transition = 'transform 0.5s ease';
  });

  previewWrapper.addEventListener('mouseenter', () => {
    previewWrapper.style.transition = 'none';
  });
}

/* --- 3. Browser Mockup Tabs --- */
function initDashboardMockupTabs() {
  const tabs = document.querySelectorAll('.browser-tab');
  const contents = document.querySelectorAll('.mockup-content');
  const sidebarLinks = document.querySelectorAll('.mockup-nav-link');

  if (!tabs.length) return;

  const switchTab = (targetId) => {
    // Reset all tabs & contents
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    sidebarLinks.forEach(l => l.classList.remove('active'));

    // Activate selected
    const activeTabButton = document.querySelector(`[data-target="${targetId}"]`);
    const activeContent = document.getElementById(targetId);
    
    if (activeTabButton) activeTabButton.classList.add('active');
    if (activeContent) activeContent.classList.add('active');

    // Sync sidebar link highlight
    if (targetId === 'mockup-tab-assets') {
      document.getElementById('mock-nav-assets')?.classList.add('active');
      document.getElementById('mock-nav-dashboard')?.classList.add('active');
    } else if (targetId === 'mockup-tab-issues') {
      document.getElementById('mock-nav-tickets')?.classList.add('active');
      document.getElementById('mock-nav-dashboard')?.classList.remove('active');
    } else {
      document.getElementById('mock-nav-dashboard')?.classList.add('active');
    }
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-target');
      if (target) switchTab(target);
    });
  });

  // Connect sidebar links to mockup tabs for cohesive experience
  document.getElementById('mock-nav-assets')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('mockup-tab-assets');
  });

  document.getElementById('mock-nav-tickets')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('mockup-tab-issues');
  });

  document.getElementById('mock-nav-dashboard')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('mockup-tab-assets'); // Default tab
  });
}

/* --- 5. Scroll triggered Statistics Counter --- */
function initStatsCounter() {
  const statsSection = document.getElementById('stats');
  if (!statsSection) return;

  const statTargets = [
    { id: 'stat-assets', end: 10000, suffix: '+', duration: 2000 },
    { id: 'stat-resolution', end: 98, suffix: '%', duration: 1500 },
    { id: 'stat-maintenance', end: 50, suffix: '%', duration: 1500 }
  ];

  let hasAnimated = false;

  const animateCounters = () => {
    statTargets.forEach(stat => {
      const el = document.getElementById(stat.id);
      if (!el) return;

      let start = 0;
      const startTime = performance.now();

      const updateCounter = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / stat.duration, 1);
        
        // Easing function outQuad
        const easeProgress = progress * (2 - progress);
        const currentValue = Math.floor(easeProgress * stat.end);
        
        el.textContent = currentValue.toLocaleString() + stat.suffix;

        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        } else {
          el.textContent = stat.end.toLocaleString() + stat.suffix;
        }
      };

      requestAnimationFrame(updateCounter);
    });
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !hasAnimated) {
        animateCounters();
        hasAnimated = true;
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  observer.observe(statsSection);
}

/* --- 6. Pricing Toggle (Monthly vs Annual) --- */
function initPricingToggle() {
  const toggleBtn = document.getElementById('billing-toggle');
  const monthlyLabel = document.getElementById('billing-monthly-label');
  const annualLabel = document.getElementById('billing-annual-label');
  
  const priceStarter = document.getElementById('price-starter');
  const pricePro = document.getElementById('price-pro');
  const priceEnterprise = document.getElementById('price-enterprise');

  if (!toggleBtn || !priceStarter || !pricePro || !priceEnterprise) return;

  let isAnnual = false;

  const pricingData = {
    monthly: { starter: 19, pro: 49, enterprise: 149 },
    annual: { starter: 15, pro: 39, enterprise: 119 }
  };

  const updatePricing = () => {
    isAnnual = !isAnnual;
    
    // Toggle class and active styling labels
    if (isAnnual) {
      toggleBtn.classList.add('active');
      annualLabel.classList.add('active');
      monthlyLabel.classList.remove('active');
      
      // Animate price values change
      animatePriceChange(priceStarter, pricingData.annual.starter);
      animatePriceChange(pricePro, pricingData.annual.pro);
      animatePriceChange(priceEnterprise, pricingData.annual.enterprise);
    } else {
      toggleBtn.classList.remove('active');
      annualLabel.classList.remove('active');
      monthlyLabel.classList.add('active');
      
      animatePriceChange(priceStarter, pricingData.monthly.starter);
      animatePriceChange(pricePro, pricingData.monthly.pro);
      animatePriceChange(priceEnterprise, pricingData.monthly.enterprise);
    }
  };

  const animatePriceChange = (element, targetValue) => {
    element.style.transform = 'scale(0.8)';
    element.style.opacity = '0';
    element.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
    
    setTimeout(() => {
      element.textContent = targetValue;
      element.style.transform = 'scale(1)';
      element.style.opacity = '1';
    }, 150);
  };

  toggleBtn.addEventListener('click', updatePricing);
  monthlyLabel.addEventListener('click', () => { if (isAnnual) updatePricing(); });
  annualLabel.addEventListener('click', () => { if (!isAnnual) updatePricing(); });
}

/* --- 7. Smooth Scroll Navigation --- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        const offset = 80; // Offset for header height
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // Track active section to highlight current navigation item
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.nav-links a');

  const highlightNav = () => {
    let scrollPosition = window.scrollY + 120;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPosition >= top && scrollPosition < top + height) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  };

  window.addEventListener('scroll', highlightNav);
}

/* ==========================================================================
   8. Theme Toggle (Dark / Light Mode)
   ========================================================================== */

const THEME_KEY = 'maintainiq-theme';

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY);
}

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function resolveTheme() {
  return getStoredTheme() || getSystemTheme();
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

function storeTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const newTheme = isLight ? 'dark' : 'light';

  // Enable smooth transition
  document.documentElement.classList.add('theme-transitioning');
  applyTheme(newTheme);
  storeTheme(newTheme);
  updateToggleButtons(newTheme);

  setTimeout(() => {
    document.documentElement.classList.remove('theme-transitioning');
  }, 400);
}

function updateToggleButtons(theme) {
  // The toggle buttons show/hide icons via CSS, but we update aria-label
  const buttons = document.querySelectorAll('.theme-toggle');
  const isLight = theme === 'light';
  buttons.forEach(btn => {
    btn.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
  });
}

// Listen for system preference changes (only if user hasn't set a preference)
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
  if (!getStoredTheme()) {
    const transitioning = document.documentElement.classList.contains('theme-transitioning');
    if (!transitioning) document.documentElement.classList.add('theme-transitioning');
    applyTheme(e.matches ? 'light' : 'dark');
    updateToggleButtons(e.matches ? 'light' : 'dark');
    if (!transitioning) {
      setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 400);
    }
  }
});

// Expose toggle function globally for onclick handlers
window.toggleTheme = toggleTheme;


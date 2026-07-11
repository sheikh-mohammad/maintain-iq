/* ==========================================================================
   MaintainIQ - Homepage Main Script (index.js)
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
  handleScroll();
}

/* --- 2. Responsive Mobile Drawer (Sidebar Menu) --- */
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
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  };

  const closeDrawer = () => {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = ''; // Restore scrolling
  };

  toggleBtn.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  // Close drawer when clicking any link inside
  drawerLinks.forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  // Keyboard accessibility: ESC key closes drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('active')) {
      closeDrawer();
    }
  });
}

/* --- 3. Hero Interactive Hover Effects --- */
function initHeroPreviewHover() {
  const previewWrapper = document.getElementById('hero-preview-wrapper');
  if (!previewWrapper) return;

  previewWrapper.addEventListener('mousemove', (e) => {
    const rect = previewWrapper.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
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

/* --- 4. Browser Mockup Tabs --- */
function initDashboardMockupTabs() {
  const tabs = document.querySelectorAll('.browser-tab');
  const contents = document.querySelectorAll('.mockup-content');
  const sidebarLinks = document.querySelectorAll('.mockup-nav-link');

  if (!tabs.length) return;

  const switchTab = (targetId) => {
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    sidebarLinks.forEach(l => l.classList.remove('active'));

    const activeTabButton = document.querySelector(`[data-target="${targetId}"]`);
    const activeContent = document.getElementById(targetId);
    
    if (activeTabButton) activeTabButton.classList.add('active');
    if (activeContent) activeContent.classList.add('active');

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
    switchTab('mockup-tab-assets');
  });
}

/* --- 6. Stats Counter --- */
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

/* --- 7. Pricing Toggle --- */
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
    
    if (isAnnual) {
      toggleBtn.classList.add('active');
      annualLabel.classList.add('active');
      monthlyLabel.classList.remove('active');
      
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

/* --- 8. Smooth Scroll Navigation --- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        const offset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

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

/**
 * app.js — Application Initializer v2.0
 * Dashboard Monitoring Webinar & Pelatihan | Pusbangkom ASN
 * =====================================================
 * Mengelola:
 *  - Navigasi sidebar SPA (dashboard, webinar, pelatihan, statistik)
 *  - Dark mode toggle (localStorage)
 *  - Realtime clock & date
 *  - Sidebar collapse/expand + mobile offcanvas
 *  - Global search
 *  - Modal close
 * =====================================================
 */

/* =====================================================
   0. DOM READY
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initClock();
  initSidebar();
  initNavigation();
  initModal();
  initSearch();
  initKeyboard();

  loadData().then(() => {
    startAutoRefresh();
  });
});

/* =====================================================
   1. THEME — Dark Mode
   ===================================================== */
function initTheme() {
  const saved = localStorage.getItem('pmw-theme') || 'light';
  applyTheme(saved);

  const toggleBtn = document.getElementById('dark-mode-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next    = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('pmw-theme', next);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (typeof updateChartTheme === 'function') {
    setTimeout(updateChartTheme, 50);
  }
}

/* =====================================================
   2. REALTIME CLOCK
   ===================================================== */
function initClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();
  const elTime = document.getElementById('topbar-time');
  const elDate = document.getElementById('topbar-date');
  if (elTime) {
    elTime.textContent = now.toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }
  if (elDate) {
    const days   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
    elDate.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }
}

/* =====================================================
   3. SIDEBAR
   ===================================================== */
let sidebarCollapsed = localStorage.getItem('pmw-sidebar') === 'collapsed';

function initSidebar() {
  const sidebar     = document.getElementById('sidebar');
  const mainContent = document.getElementById('main-content');
  const overlay     = document.getElementById('sidebar-overlay');

  if (sidebarCollapsed && window.innerWidth > 767) {
    sidebar?.classList.add('collapsed');
    mainContent?.classList.add('sidebar-collapsed');
  }

  const toggleBtn = document.getElementById('topbar-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (window.innerWidth <= 767) {
        openMobileSidebar();
      } else {
        toggleSidebarCollapse();
      }
    });
  }

  overlay?.addEventListener('click', closeMobileSidebar, { passive: true });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 767) closeMobileSidebar();
  }, { passive: true });
}

function toggleSidebarCollapse() {
  const sidebar     = document.getElementById('sidebar');
  const mainContent = document.getElementById('main-content');
  sidebarCollapsed  = !sidebarCollapsed;
  sidebar?.classList.toggle('collapsed', sidebarCollapsed);
  mainContent?.classList.toggle('sidebar-collapsed', sidebarCollapsed);
  localStorage.setItem('pmw-sidebar', sidebarCollapsed ? 'collapsed' : 'expanded');
}

function openMobileSidebar() {
  document.getElementById('sidebar')?.classList.add('mobile-open');
  document.getElementById('sidebar-overlay')?.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('mobile-open');
  document.getElementById('sidebar-overlay')?.classList.remove('visible');
  document.body.style.overflow = '';
}

/* =====================================================
   4. NAVIGATION — SPA Pages
   ===================================================== */
let currentPage = 'dashboard';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  webinar:   'Rekap Webinar',
  pelatihan: 'Monitoring Pelatihan',
  statistik: 'Statistik',
};

function initNavigation() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.getAttribute('data-page');
      if (page) {
        navigateTo(page);
        if (window.innerWidth <= 767) closeMobileSidebar();
      }
    });
    // Keyboard: Enter/Space
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });
  });
}

function navigateTo(page) {
  if (page === currentPage) return;
  currentPage = page;

  // Update active nav
  document.querySelectorAll('.nav-item').forEach(item => {
    const isActive = item.getAttribute('data-page') === page;
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  // Show/hide sections
  document.querySelectorAll('.section-page').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.classList.add('active');
  }

  // Update topbar title
  const titleEl = document.getElementById('topbar-page-title');
  if (titleEl) titleEl.textContent = PAGE_TITLES[page] || page;

  // Lazy render on enter
  onPageEnter(page);

  history.pushState({ page }, '', `#${page}`);
}

function onPageEnter(page) {
  if (page === 'statistik') {
    // Render statistik charts + ranking table
    if (window.AppData.webinars?.length) {
      if (typeof renderTopYTChart   === 'function') renderTopYTChart();
      if (typeof renderTopZoomChart === 'function') renderTopZoomChart();
      if (typeof renderRankingTable === 'function') renderRankingTable();
    }
  }
}

/* =====================================================
   5. BACK BUTTON / URL HASH
   ===================================================== */
window.addEventListener('popstate', (e) => {
  const page = e.state?.page || location.hash.replace('#','') || 'dashboard';
  navigateTo(page);
});

window.addEventListener('load', () => {
  const hash = location.hash.replace('#','');
  if (hash && PAGE_TITLES[hash]) navigateTo(hash);
});

/* =====================================================
   6. MODAL
   ===================================================== */
function initModal() {
  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('detail-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'detail-modal') closeModal();
  });
}

function closeModal() {
  document.getElementById('detail-modal')?.classList.remove('visible');
}

/* =====================================================
   7. GLOBAL SEARCH
   ===================================================== */
let searchDebounce = null;

function initSearch() {
  const input = document.getElementById('topbar-search');
  if (!input) return;

  input.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => performSearch(e.target.value.trim()), 350);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = ''; }
  });
}

function performSearch(query) {
  if (!query || query.length < 2) return;
  const q = query.toLowerCase();

  const webinarMatches  = window.AppData.webinars?.filter(w => w.nama.toLowerCase().includes(q)) || [];
  const pelatihanMatches = window.AppData.pelatihan?.filter(p => p.nama.toLowerCase().includes(q) || p.metode?.toLowerCase().includes(q)) || [];
  const total = webinarMatches.length + pelatihanMatches.length;

  if (total === 0) {
    if (typeof showToast === 'function') showToast('info', 'Pencarian', `Tidak ditemukan hasil untuk "${query}"`);
  } else {
    if (typeof showToast === 'function') showToast('success', 'Ditemukan', `${total} hasil untuk "${query}"`);
    if (pelatihanMatches.length > 0) navigateTo('pelatihan');
    else if (webinarMatches.length > 0) navigateTo('webinar');
  }
}

/* =====================================================
   8. KEYBOARD ACCESSIBILITY
   ===================================================== */
function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('topbar-search')?.focus();
    }
  });
}

/* =====================================================
   9. RIPPLE EFFECT
   ===================================================== */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn, .nav-item');
  if (!btn) return;
  const ripple = document.createElement('span');
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  Object.assign(ripple.style, {
    position: 'absolute', width: `${size}px`, height: `${size}px`,
    left: `${e.clientX - rect.left - size/2}px`,
    top:  `${e.clientY - rect.top  - size/2}px`,
    borderRadius: '50%', background: 'rgba(255,255,255,0.3)',
    transform: 'scale(0)', animation: 'rippleEffect 0.5s ease-out',
    pointerEvents: 'none', zIndex: '10',
  });
  btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 500);
}, { passive: true });

// Inject ripple keyframe
const rs = document.createElement('style');
rs.textContent = `@keyframes rippleEffect { to { transform: scale(2.5); opacity: 0; } }`;
document.head.appendChild(rs);

/* =====================================================
   10. SCROLL PERFORMANCE
   ===================================================== */
window.addEventListener('scroll', () => {
  const topbar = document.getElementById('topbar');
  if (topbar) {
    topbar.style.boxShadow = window.scrollY > 4
      ? '0 4px 20px rgba(0,0,0,.08)' : 'none';
  }
}, { passive: true });

/* =====================================================
   11. EXPOSE navigateTo GLOBALLY
   ===================================================== */
window.navigateTo = navigateTo;

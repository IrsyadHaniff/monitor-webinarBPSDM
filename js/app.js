/**
 * app.js — Application Initializer v2.0
 * Dashboard Monitoring Webinar & Pelatihan | Pusbangkom
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
   0. DOM
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
  const toggleBtn = document.getElementById('dark-mode-toggle');
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
  }
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
  alumni:    'Monitoring Alumni',
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
  if (page === 'alumni') {
    // Populate dropdown jika data sudah tersedia
    if (window.AppData.alumni?.length && typeof populateAlumniDropdowns === 'function') {
      populateAlumniDropdowns();
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
   5b. ALUMNI SEARCH HANDLERS
   ===================================================== */
function handleAlumniSearch() {
  const query     = (document.getElementById('alumni-search-input')?.value || '').trim();
  const unitKerja = document.getElementById('alumni-filter-unit-kerja')?.value || '';
  const provinsi  = document.getElementById('alumni-filter-provinsi')?.value  || '';

  if (!query && !unitKerja && !provinsi) {
    if (typeof showToast === 'function') showToast('info', 'Pencarian Alumni', 'Masukkan kata kunci atau pilih filter terlebih dahulu.');
    return;
  }

  if (typeof searchAlumni !== 'function') {
    if (typeof showToast === 'function') showToast('error', 'Error', 'Fungsi pencarian belum siap. Coba refresh halaman.');
    return;
  }

  const results = searchAlumni(query, unitKerja, provinsi);
  if (typeof renderAlumniResults === 'function') {
    renderAlumniResults(results);
  }

  if (results.length === 0) {
    if (typeof showToast === 'function') showToast('info', 'Hasil Pencarian', `Tidak ada alumni yang cocok dengan filter yang dipilih.`);
  } else {
    if (typeof showToast === 'function') showToast('success', 'Hasil Ditemukan', `${results.length} alumni ditemukan.`);
  }
}

function handleAlumniReset() {
  const input = document.getElementById('alumni-search-input');
  if (input) input.value = '';

  // Reset searchable dropdowns
  sdSetValue('unit-kerja', '', 'Semua Unit Kerja');
  sdSetValue('provinsi', '', 'Semua Provinsi');

  const resultSection = document.getElementById('alumni-result-section');
  if (resultSection) resultSection.style.display = 'none';
}

// Enter key di input pencarian alumni
document.addEventListener('DOMContentLoaded', () => {
  const alumniInput = document.getElementById('alumni-search-input');
  if (alumniInput) {
    alumniInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAlumniSearch();
    });
  }
});

window.handleAlumniSearch = handleAlumniSearch;
window.handleAlumniReset  = handleAlumniReset;

/* =====================================================
   5c. SEARCHABLE DROPDOWN — Core Logic
   ===================================================== */

const SD_CONFIGS = [
  { id: 'unit-kerja', defaultLabel: 'Semua Unit Kerja' },
  { id: 'provinsi',   defaultLabel: 'Semua Provinsi'   },
];

/** Buka/tutup satu dropdown, akan menututup yang lain */
function sdToggle(id) {
  const wrap = document.getElementById(`dropdown-${id}`);
  if (!wrap) return;
  const isOpen = wrap.classList.contains('open');
  sdCloseAll();
  if (!isOpen) {
    wrap.classList.add('open');
    wrap.querySelector('.sd-selected')?.setAttribute('aria-expanded', 'true');
    // Fokus ke input search
    setTimeout(() => {
      wrap.querySelector('.sd-search-input')?.focus();
    }, 50);
  }
}

function sdCloseAll() {
  document.querySelectorAll('.searchable-dropdown.open').forEach(wrap => {
    wrap.classList.remove('open');
    wrap.querySelector('.sd-selected')?.setAttribute('aria-expanded', 'false');
    // Clear search
    const id      = wrap.id.replace('dropdown-', '');
    const searchEl = wrap.querySelector('.sd-search-input');
    if (searchEl) { searchEl.value = ''; sdFilterOptions(id); }
  });
}

/** Set nilai hidden input + tampilan teks */
function sdSetValue(id, value, label) {
  const hidden = document.getElementById(`alumni-filter-${id}`);
  const textEl = document.getElementById(`sd-${id}-text`);
  const config = SD_CONFIGS.find(c => c.id === id);

  if (hidden) hidden.value = value;
  if (textEl) {
    const displayLabel = label || config?.defaultLabel || value || '';
    textEl.textContent = displayLabel;
    // Abu-abu hanya jika benar-benar tidak ada label
    textEl.classList.toggle('placeholder', !displayLabel);
  }

  // Update selected state pada options
  const optionsEl = document.getElementById(`sd-${id}-options`);
  if (optionsEl) {
    optionsEl.querySelectorAll('.sd-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.value === value);
    });
  }

  sdCloseAll();
}

/** Filter opsi berdasarkan teks pencarian */
function sdFilterOptions(id) {
  const searchEl  = document.getElementById(`sd-${id}-search`);
  const optionsEl = document.getElementById(`sd-${id}-options`);
  if (!searchEl || !optionsEl) return;

  const query = searchEl.value.trim().toLowerCase();
  const opts  = optionsEl.querySelectorAll('.sd-option');
  let visibleCount = 0;

  opts.forEach(opt => {
    const label = opt.dataset.label || '';
    const match = label.toLowerCase().includes(query);
    opt.style.display = match ? '' : 'none';
    if (match) visibleCount++;
  });

  // Tampilkan/sembunyikan state
  let emptyEl = optionsEl.querySelector('.sd-empty');
  if (visibleCount === 0) {
    if (!emptyEl) {
      emptyEl = document.createElement('div');
      emptyEl.className = 'sd-empty';
      optionsEl.appendChild(emptyEl);
    }
    emptyEl.textContent = `Tidak ada hasil untuk "${searchEl.value}"`;
    emptyEl.style.display = '';
  } else if (emptyEl) {
    emptyEl.style.display = 'none';
  }
}

/** Isi opsi dropdown dari array data */
function sdPopulate(id, values, defaultLabel) {
  const optionsEl = document.getElementById(`sd-${id}-options`);
  if (!optionsEl) return;

  const config   = SD_CONFIGS.find(c => c.id === id);
  const defLabel = defaultLabel || config?.defaultLabel || 'Semua';

  let html = `<div class="sd-option selected" data-value="" data-label="${defLabel}" onclick="sdSetValue('${id}', '', '${defLabel}')">${defLabel}</div>`;
  values.forEach(v => {
    const label = v || '(Tidak diketahui)';
    html += `<div class="sd-option" data-value="${v}" data-label="${label}" onclick="sdSetValue('${id}', '${v.replace(/'/g, "\\'")}', '${label.replace(/'/g, "\\'")}')">${label}</div>`;
  });
  optionsEl.innerHTML = html;
}

/** Init event listeners untuk semua searchable dropdown */
function initSearchableDropdowns() {
  SD_CONFIGS.forEach(({ id }) => {
    const selectedEl = document.getElementById(`sd-${id}-selected`);
    const searchEl   = document.getElementById(`sd-${id}-search`);

    // Toggle buka/tutup saat klik area trigger
    selectedEl?.addEventListener('click', (e) => { e.stopPropagation(); sdToggle(id); });

    // Keyboard trigger
    selectedEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        sdToggle(id);
      }
      if (e.key === 'Escape') sdCloseAll();
    });

    // Input search, filter, keyboard
    searchEl?.addEventListener('input', () => sdFilterOptions(id));
    searchEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { sdCloseAll(); selectedEl?.focus(); }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const first = document.querySelector(`#sd-${id}-options .sd-option:not([style*="display: none"])`);
        first?.focus();
      }
    });

    // Keyboard navigation dalam options
    const optionsEl = document.getElementById(`sd-${id}-options`);
    optionsEl?.addEventListener('keydown', (e) => {
      const visOpts = [...optionsEl.querySelectorAll('.sd-option:not([style*="display: none"])')];
      const cur = document.activeElement;
      const idx = visOpts.indexOf(cur);
      if (e.key === 'ArrowDown') { e.preventDefault(); visOpts[idx + 1]?.focus(); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); idx > 0 ? visOpts[idx - 1]?.focus() : searchEl?.focus(); }
      if (e.key === 'Enter')     { e.preventDefault(); cur?.click(); }
      if (e.key === 'Escape')    { sdCloseAll(); selectedEl?.focus(); }
    });
  });

  // Tutup dropdown saat klik di luar
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.searchable-dropdown')) sdCloseAll();
  });
}

// Jalankan setelah DOM siap
document.addEventListener('DOMContentLoaded', initSearchableDropdowns);

// Expose ke global agar bisa dipanggil dari spreadsheet.js
window.sdPopulate = sdPopulate;
window.sdSetValue = sdSetValue;


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


console.log(
  "%cDashboard Monitoring Data Pusbangkom\nDeveloped by Irsyad Hanif Munawar",
  "color:#F0C332;font-size:6px;font-weight:bold;"
);
/**
 * spreadsheet.js — Data Engine v2.0
 * Dashboard Monitoring Webinar & Pelatihan | Pusbangkom
 * =====================================================
 * Sumber data: dummy.json (saat ini)
 * Untuk connect ke Google Spreadsheet:
 *   → Set CONFIG.USE_DUMMY = false
 *   → Isi CONFIG.SPREADSHEET_URL dengan URL Apps Script
 * =====================================================
 */

/* =====================================================
   0. GLOBAL STATE
   ===================================================== */
window.AppData = {
  webinars: [],
  pelatihan: [],
  alumni: [],
  rekapAlumni: [], // daftar unit kerja & provinsi dari sheet Rekap_Alumni
  stats: {},
  lastUpdated: null,
  isLoading: false,
  error: null,
};

/* =====================================================
   1. CONFIGURATION
   ===================================================== */
const CONFIG = {
  /**
   * Ganti ke false + isi SPREADSHEET_URL untuk data real.
   */
  USE_DUMMY: false,

  /**
   * URL Google Apps Script Web App.
   * Format: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec'
   */
  SPREADSHEET_URL: "https://script.google.com/macros/s/AKfycbzXnuyvcNt6Z9NSoavRjKFIWSgK45-rweqNGYy2WneFn1-G4hu-OCqNsvgxaVyTYePQjg/exec",

  DUMMY_PATH: "data/dummy.json",
  REFRESH_INTERVAL: 3600000,
  FETCH_TIMEOUT: 15000,
};

window.CONFIG = CONFIG;

/* =====================================================
   2. UTILITIES
   ===================================================== */

function formatTanggal(dateStr) {
  if (!dateStr) return "-";
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatNumber(num) {
  if (num === null || num === undefined || num === "") return "0";
  return Number(num).toLocaleString("id-ID");
}

async function fetchWithTimeout(url, timeout = CONFIG.FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

/* =====================================================
   3. DATA LOADING
   ===================================================== */

async function loadData() {
  if (window.AppData.isLoading) return;
  window.AppData.isLoading = true;
  showLoadingState();

  try {
    let rawData;
    if (CONFIG.USE_DUMMY) {
      rawData = await loadDummyData();
    } else {
      rawData = await fetchSpreadsheet();
    }

    processData(rawData);
    window.AppData.error = null;
    window.AppData.lastUpdated = new Date();

    updateDashboard();
    renderTable();
    renderCharts();
    updateRefreshBar("success");
    showToast("success", "Data Berhasil Dimuat", `Diperbarui: ${formatWaktu(window.AppData.lastUpdated)}`);
  } catch (err) {
    console.error("[loadData] Error:", err);
    window.AppData.error = err.message;
    showErrorState(err.message);
    updateRefreshBar("error");
    showToast("error", "Gagal Memuat Data", "Silakan coba beberapa saat lagi.");
  } finally {
    window.AppData.isLoading = false;
    hideLoadingState();
  }
}

async function loadDummyData() {
  const res = await fetchWithTimeout(CONFIG.DUMMY_PATH);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return await res.json();
}

/**
 * fetchSpreadsheet() — Fetch dari Google Apps Script API.
 *
 * Apps Script response harus memiliki struktur:
 * {
 *   webinars: [{ id, nama, tanggal, kuotaPeserta, jumlahPeserta,
 *                jumlahPenerimaSertifikat, jumlahMenontonYT,
 *                jumlahMenontonZoom, narasumber, moderator,
 *                keynoteSpeaker, kriteriaPeserta,
 *                linkEviden, status, keterangan }],
 *   pelatihan: [{ id, nama, metode, tanggalMulai, tanggalSelesai,
 *                  jumlahPeserta, lulus, tidakLulus, proses,
 *                  keterangan, lokasiPelatihan, pic, linkEviden }]
 * }
 *
 * PENTING: Nama header kolom di Google Spreadsheet harus SAMA PERSIS
 * dengan nama key di atas (case-sensitive), karena Apps Script
 * menggunakan header baris pertama sebagai key JSON.
 *
 * Pemetaan header spreadsheet → key JSON:
 *   "Narasumber"      → narasumber
 *   "Moderator"       → moderator
 *   "Keynote Speech"  → keynoteSpeaker   ← RENAME kolom ke "keynoteSpeaker" di spreadsheet
 *   "Kriteria Peserta"→ kriteriaPeserta  ← RENAME kolom ke "kriteriaPeserta" di spreadsheet
 *
 * Contoh Apps Script (Code.gs):
 * --------------------------------
 * // ambil data dari id spredsheet
function doGet() {

  const ss = SpreadsheetApp.openById(
    "1r4a4apyQ-BIP52lFiPFTp7I8-UUq_34rBHPtNGNcgF4"
  );

  return ContentService
    .createTextOutput(
      JSON.stringify({
        webinars: getWebinar(ss),
        pelatihan: getPelatihan(ss),
        alumni: getAlumni(ss)
      })
    )
    .setMimeType(ContentService.MimeType.JSON);
}

// =========================
// WEBINAR
// =========================

function getWebinar(ss){

  const sheet = ss.getSheetByName("Webinar");

  if(!sheet) return [];

  const values = sheet.getDataRange().getValues();

  const result = [];

  // data mulai baris ke-6
  for(let i=5;i<values.length;i++){

    const r = values[i];

    if(!r[1]) continue;

    result.push({

      id : "WEB"+String(r[0]).padStart(3,"0"),

      nama : r[1],

      tanggal : formatDate(r[2]),

      linkEviden : r[3],

      jumlahPeserta : Number(r[4])||0,

      jumlahPenerimaSertifikat : Number(r[5])||0,

      jumlahMenontonYT : Number(r[6])||0,

      jumlahMenontonZoom : Number(r[7])||0,

      narasumber : r[8],

      moderator : r[9],

      keynoteSpeaker : r[10],

      kriteriaPeserta : r[11],

      status : "Selesai",

      keterangan : ""

    });

  }

  return result;

}

// =========================
// PELATIHAN
// =========================

function getPelatihan(ss){

  const sheet = ss.getSheetByName("Pelatihan");

  if(!sheet) return [];

  const values = sheet.getDataRange().getValues();

  const header = values[0];

  const result = [];

  function col(name){
    return header.indexOf(name);
  }

  for(let i=1;i<values.length;i++){

    const r = values[i];

    if(!r[col("Nama Pelatihan")]) continue;

    result.push({

      id : "PLT"+String(r[col("No")]).padStart(3,"0"),

      nama : r[col("Nama Pelatihan")],

      metode : r[col("Metode")],

      tanggalMulai : formatDate(r[col("Tanggal Penyelenggaraan")]),

      tanggalSelesai : "",

      lulus: Number(r[60]) || 0,
      
      tidakLulus: Number(r[61]) || 0,

      jumlahPeserta : Number(r[col("Jumlah Peserta")])||0,

      proses : r[col("Proses")],

      keterangan : r[col("Keterangan")],

      lokasiPelatihan : r[col("Lokasi Pelatihan")],

      pic : r[col("PIC")],

      linkEviden : r[col("Link Upload Eviden Kegiatan")]

    });

  }

  return result;

}

// =========================
// Monitoring Alumni
// =========================
function getAlumni(ss) {
  const sheet = ss.getSheetByName("Monitoring_Alumni");
  if (!sheet) return [];

  const dataRange    = sheet.getDataRange();
  const values       = dataRange.getValues();        // untuk data biasa
  const displayValues = dataRange.getDisplayValues(); // ← untuk NIP (hindari presisi float)

  const header = values[0];

  function col(name) {
    return header.indexOf(name);
  }

  const result = [];

  for (let i = 1; i < values.length; i++) {
    const r  = values[i];
    const rd = displayValues[i];

    // Lewati baris kosong
    if (!r[col("Nip")] && !r[col("Nama")]) continue;

    result.push({
      no       : r[col("No")],
      nip      : String(rd[col("Nip")] || "").trim(),
      nama     : String(r[col("Nama")] || "").trim(),
      jabatan  : String(r[col("Jabatan")] || "").trim(),
      unitKerja: String(r[col("Unit Kerja")] || "").trim(),
      provinsi : String(r[col("Provinsi")] || "").trim(),
      pkp      : String(r[col("Pkp")] || "").trim(),
      pka      : String(r[col("Pka")] || "").trim()
    });
  }

  return result;
}


  // =========================
  // Mengubah nilai bertipe Date menjadi
  // format "yyyy-MM-dd" (zona waktu Asia/Jakarta).

  function formatDate(d){

    if(d instanceof Date){

      return Utilities.formatDate(
        d,
        "Asia/Jakarta",
        "yyyy-MM-dd"
      );

    }

    return d;

  }
 */
async function fetchSpreadsheet() {
  if (!CONFIG.SPREADSHEET_URL) {
    throw new Error("SPREADSHEET_URL belum dikonfigurasi.");
  }
  const url = `${CONFIG.SPREADSHEET_URL}?t=${Date.now()}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  if (!data.webinars && !data.pelatihan && !data.alumni) {
    throw new Error("Format response tidak sesuai. Pastikan Apps Script mengembalikan field webinars, pelatihan, dan/atau alumni.");
  }
  return data;
}

function processData(rawData) {
  // Filter dan normalisasi data webinar
  let webinars = rawData.webinars || [];
  webinars = webinars.filter(w => w.nama && String(w.nama).trim() !== '');
  webinars = webinars.map(w => ({
    ...w,
    status: normalizeWebinarStatus(w.status),
  }));

  // Filter dan normalisasi data pelatihan
  let pelatihan = rawData.pelatihan || [];
  pelatihan = pelatihan.filter(p => p.nama && String(p.nama).trim() !== '');
  pelatihan = pelatihan.map(p => ({
    ...p,
    proses: normalizeProsesStatus(p.proses),
  }));

  // Filter dan normalisasi data alumni
  let alumni = rawData.alumni || [];
  alumni = alumni.filter(a => {
    const nip  = String(a.Nip  || a.nip  || a.NIP  || '').trim();
    const nama = String(a.Nama || a.nama || '').trim();
    return nip !== '' || nama !== '';
  });
  alumni = alumni.map(a => ({
    nip        : String(a.Nip        || a.nip        || a.NIP        || '').trim(),
    nama       : String(a.Nama       || a.nama       || '').trim(),
    jabatan    : String(a.Jabatan    || a.jabatan    || '').trim(),
    unitKerja  : String(a['Unit Kerja'] || a.unitKerja || a['UnitKerja'] || '').trim(),
    provinsi   : String(a.Provinsi   || a.provinsi   || '').trim(),
    pkp        : String(a.Pkp        || a.pkp        || a.PKP        || '').trim(),
    pka        : String(a.Pka        || a.pka        || a.PKA        || '').trim(),
  }));

  // Simpan rekapAlumni (referensi unit kerja & provinsi dari Rekap_Alumni)
  const rekapAlumni = (rawData.rekapAlumni || []).filter(
    r => r.unitKerja && String(r.unitKerja).trim() !== ''
  );

  window.AppData.webinars    = webinars;
  window.AppData.pelatihan   = pelatihan;
  window.AppData.alumni      = alumni;
  window.AppData.rekapAlumni = rekapAlumni;
  window.AppData.stats = hitungStatistik();

  // Populate dropdown alumni setelah data siap
  populateAlumniDropdowns();
}

/**
 * Normalisasi status webinar agar sesuai dengan filter badge.
 * Spreadsheet bisa menggunakan variasi nama status.
 */
function normalizeWebinarStatus(status) {
  const s = String(status || '').trim().toLowerCase();
  if (s === 'selesai' || s === 'telah terselenggara' || s === 'telah diselenggarakan') return 'Selesai';
  if (s === 'sedang berlangsung') return 'Sedang Berlangsung';
  if (s === 'akan datang' || s === 'akan diselenggarakan' || s === 'belum dimulai' || s === '') return 'Akan Datang';
  return status || 'Akan Datang';
}

/**
 * Normalisasi proses pelatihan.
 */
function normalizeProsesStatus(proses) {
  const s = String(proses || '').trim().toLowerCase();
  if (s === 'telah terselenggara' || s === 'selesai') return 'Telah Terselenggara';
  if (s === 'sedang berlangsung') return 'Sedang Berlangsung';
  if (s === 'akan datang' || s === 'akan diselenggarakan' || s === '' || s === 'belum dimulai') return 'Akan Datang';
  return proses || 'Akan Datang';
}

function hitungStatistik() {
  const { webinars, pelatihan } = window.AppData;

  const totalWebinar = webinars.length;
  const totalPelatihan = pelatihan.length;
  const totalPesertaWebinar = webinars.reduce((s, w) => s + (w.jumlahPeserta || 0), 0);
  const totalSertifikat = webinars.reduce((s, w) => s + (w.jumlahPenerimaSertifikat || 0), 0);
  const totalYT = webinars.reduce((s, w) => s + (w.jumlahMenontonYT || 0), 0);
  const totalZoom = webinars.reduce((s, w) => s + (w.jumlahMenontonZoom || 0), 0);
  const totalPesertaPlt = pelatihan.reduce((s, p) => s + (p.jumlahPeserta || 0), 0);
  const totalLulus = pelatihan.reduce((s, p) => s + (p.lulus || 0), 0);
  const totalTidakLulus = pelatihan.reduce((s, p) => s + (p.tidakLulus || 0), 0);

  // Top webinar by YouTube viewers
  const topByYT = [...webinars].filter((w) => w.jumlahMenontonYT > 0).sort((a, b) => b.jumlahMenontonYT - a.jumlahMenontonYT);

  // Top webinar by Zoom
  const topByZoom = [...webinars].filter((w) => w.jumlahMenontonZoom > 0).sort((a, b) => b.jumlahMenontonZoom - a.jumlahMenontonZoom);

  return {
    totalWebinar,
    totalPelatihan,
    totalPesertaWebinar,
    totalSertifikat,
    totalYT,
    totalZoom,
    totalPesertaPlt,
    totalLulus,
    totalTidakLulus,
    topByYT,
    topByZoom,
  };
}

// function hitungStatistik() {
//   const { webinars, pelatihan } = window.AppData;

//   // Hanya hitung pelatihan yang sudah berjalan (punya data peserta)
//   const pelatihanBerjalan = pelatihan.filter(p => p.proses !== "Akan Datang");

//   const totalWebinar = webinars.length;
//   const totalPelatihan = pelatihanBerjalan.length; // ganti dari pelatihan.length
//   const totalPesertaWebinar = webinars.reduce((s, w) => s + (w.jumlahPeserta || 0), 0);
//   const totalSertifikat = webinars.reduce((s, w) => s + (w.jumlahPenerimaSertifikat || 0), 0);
//   const totalYT = webinars.reduce((s, w) => s + (w.jumlahMenontonYT || 0), 0);
//   const totalZoom = webinars.reduce((s, w) => s + (w.jumlahMenontonZoom || 0), 0);
//   const totalPesertaPlt = pelatihanBerjalan.reduce((s, p) => s + (p.jumlahPeserta || 0), 0); // ganti dari pelatihan
//   const totalLulus = pelatihanBerjalan.reduce((s, p) => s + (p.lulus || 0), 0);
//   const totalTidakLulus = pelatihanBerjalan.reduce((s, p) => s + (p.tidakLulus || 0), 0);

//   const topByYT = [...webinars].filter((w) => w.jumlahMenontonYT > 0).sort((a, b) => b.jumlahMenontonYT - a.jumlahMenontonYT);
//   const topByZoom = [...webinars].filter((w) => w.jumlahMenontonZoom > 0).sort((a, b) => b.jumlahMenontonZoom - a.jumlahMenontonZoom);

//   return {
//     totalWebinar,
//     totalPelatihan,
//     totalPesertaWebinar,
//     totalSertifikat,
//     totalYT,
//     totalZoom,
//     totalPesertaPlt,
//     totalLulus,
//     totalTidakLulus,
//     topByYT,
//     topByZoom,
//     totalPelatihanAkanDatang: pelatihan.length - pelatihanBerjalan.length, // opsional, buat info tambahan
//   };
// }

/* =====================================================
   4. UPDATE DASHBOARD — STAT CARDS
   ===================================================== */

function updateDashboard() {
  const s = window.AppData.stats;

  animateCounter("stat-total-webinar", s.totalWebinar);
  animateCounter("stat-total-pelatihan", s.totalPelatihan);
  animateCounter("stat-total-peserta-webinar", s.totalPesertaWebinar);
  animateCounter("stat-sertifikat-webinar", s.totalSertifikat);
  animateCounter("stat-total-yt", s.totalYT);
  animateCounter("stat-total-peserta-plt", s.totalPesertaPlt);

  // Pelatihan summary
  setElText("plt-total", formatNumber(s.totalPelatihan));
  setElText("plt-lulus", formatNumber(s.totalLulus));
  setElText("plt-tidak-lulus", formatNumber(s.totalTidakLulus));

  // Progress bars
  const maxPeserta = s.totalWebinar > 0 ? s.totalPesertaWebinar : 1;
  setProgressBar("progress-peserta-web", s.totalPesertaWebinar, maxPeserta);
  setProgressBar("progress-sertifikat-web", s.totalSertifikat, s.totalPesertaWebinar || 1);
  setProgressBar("progress-yt", s.totalYT, Math.max(s.totalYT, s.totalZoom) || 1);
  setProgressBar("progress-peserta-plt", s.totalPesertaPlt, s.totalPesertaPlt || 1);

  // Last updated
  const elLU = document.getElementById("last-updated");
  if (elLU && window.AppData.lastUpdated) {
    elLU.textContent = `Terakhir diperbarui: ${formatWaktu(window.AppData.lastUpdated)}`;
  }
}

function animateCounter(elId, target, suffix = "", duration = 1200) {
  const el = document.getElementById(elId);
  if (!el) return;
  const end = parseFloat(target) || 0;
  const startTime = performance.now();
  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = end * eased;
    el.textContent = Number.isInteger(end) ? formatNumber(Math.floor(current)) + suffix : current.toFixed(1) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function setProgressBar(elId, value, total) {
  const el = document.getElementById(elId);
  if (!el) return;
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  el.style.width = `${pct}%`;
}

function setElText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* =====================================================
   5. RENDER TABLES
   ===================================================== */

function renderTable() {
  renderWebinarTable();
  renderPelatihanTable();
  renderRankingTable();
}

/* ----- Webinar Table ----- */
function renderWebinarTable() {
  const tbody = document.getElementById("webinar-tbody");
  const webinars = window.AppData.webinars;
  if (!tbody) return;

  // Update badge count
  const badge = document.getElementById("webinar-count-badge");
  if (badge) badge.textContent = `${webinars.length} Webinar`;

  if (!webinars.length) {
    tbody.innerHTML = emptyRow(13, "webinar", "Belum ada data webinar.");
    return;
  }

  tbody.innerHTML = webinars
    .map((w, i) => {
      const badgeCls = getStatusBadgeWebinar(w.status);

      // Link eviden / teklap
      const evidenLink = w.linkEviden
        ? `<a href="${w.linkEviden}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" aria-label="Buka eviden kegiatan ${w.nama}"><i class="bi bi-box-arrow-up-right"></i> Buka</a>`
        : `<span style="font-size:11px;color:var(--text-muted)">—</span>`;

      // Link upload teklap (gunakan field linkEviden sebagai link teklap, atau field tersendiri jika ada)
      const teklapLink = w.linkEviden
        ? `<a href="${w.linkEviden}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" style="font-size:11px"><i class="bi bi-cloud-upload"></i> Lihat</a>`
        : `<span style="font-size:11px;color:var(--text-muted)">—</span>`;

      const pctSert = w.jumlahPeserta > 0 ? Math.round((w.jumlahPenerimaSertifikat / w.jumlahPeserta) * 100) : 0;

      // Field narasumber, moderator, keynoteSpeaker, kriteriaPeserta
      // Nama field harus sesuai dengan header kolom di spreadsheet (case-sensitive)
      const narasumber   = w.narasumber    || w.Narasumber    || "—";
      const moderator    = w.moderator     || w.Moderator     || "—";
      const keynote      = w.keynoteSpeaker || w["Keynote Speech"] || w.keynoteSpeech || "—";
      const kriteria     = w.kriteriaPeserta || w["Kriteria Peserta"] || "—";

      return `
      <tr data-status="${w.status}">
        <td style="text-align:center;font-weight:700;color:var(--text-muted)">${i + 1}</td>
        <td style="max-width:350px; white-space:normal; overflow-wrap:break-word;">
          <div style="font-weight:700;color:var(--text-primary);line-height:1.4;margin-bottom:2px;">${w.nama}</div>
          <div style="font-size:11px;color:var(--text-muted)">${w.id}</div>
        </td>
        <td style="white-space:nowrap">${formatTanggal(w.tanggal)}</td>
        <td style="text-align:center">${teklapLink}</td>
        <td style="text-align:center">
          <div style="font-weight:700;font-size:15px;color:var(--color-secondary)">${formatNumber(w.jumlahPeserta)}</div>
        </td>
        <td style="text-align:center">
          <div style="font-weight:700;color:var(--color-success)">${formatNumber(w.jumlahPenerimaSertifikat)}</div>
          <div style="font-size:10px;color:var(--text-muted)">${pctSert}% dari peserta</div>
        </td>
        <td style="text-align:center">
          <div style="font-weight:700;color:#DC2626;display:flex;align-items:center;gap:4px;justify-content:center">
            <i class="bi bi-youtube" style="font-size:14px"></i>
            ${formatNumber(w.jumlahMenontonYT)}
          </div>
        </td>
        <td style="text-align:center">
          <div style="font-weight:700;color:#2D8CFF;display:flex;align-items:center;gap:4px;justify-content:center">
            <i class="bi bi-camera-video-fill" style="font-size:14px"></i>
            ${formatNumber(w.jumlahMenontonZoom)}
          </div>
        </td>
        <td style="font-size:12px;white-space:normal;min-width:140px">${narasumber.replace(/\n/g, "<br>")}</td>
        <td style="font-size:12px;white-space:normal;min-width:140px">${moderator}</td>
        <td style="font-size:12px;white-space:normal;min-width:140px">${keynote}</td>
        <td style="font-size:12px;white-space:normal;min-width:180px;color:var(--text-secondary)">${kriteria}</td>
        <td><span class="badge ${badgeCls}">${w.status}</span></td>
        <td>${evidenLink}</td>
      </tr>`;
    })
    .join("");
}

/* ----- Pelatihan Table ----- */
function renderPelatihanTable() {
  const tbody = document.getElementById("pelatihan-tbody");
  const pelatihan = window.AppData.pelatihan;
  if (!tbody) return;

  const badge = document.getElementById("pelatihan-count-badge");
  if (badge) badge.textContent = `${pelatihan.length} Pelatihan`;

  if (!pelatihan.length) {
    tbody.innerHTML = emptyRow(12, "journal-text", "Belum ada data pelatihan.");
    return;
  }

  tbody.innerHTML = pelatihan
    .map((p, i) => {
      const prosesBadge = getProsesBadge(p.proses);
      const metodeBadge = getMetodeBadge(p.metode);
      const evidenLink = p.linkEviden
        ? `<a href="${p.linkEviden}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm"><i class="bi bi-box-arrow-up-right"></i> Buka</a>`
        : `<span style="font-size:11px;color:var(--text-muted)">—</span>`;

      const tgl = p.tanggalMulai && p.tanggalSelesai ? `${formatTanggal(p.tanggalMulai)}<br><span style="font-size:10px;color:var(--text-muted)">s.d. ${formatTanggal(p.tanggalSelesai)}</span>` : formatTanggal(p.tanggalMulai) || "-";

      return `
  <tr data-proses="${p.proses}">
    <td style="text-align:center;font-weight:700;color:var(--text-muted)">${i + 1}</td>
    <td style="white-space:normal">
      <div style="font-weight:700;color:var(--text-primary);line-height:1.4;margin-bottom:2px">${p.nama}</div>
      <div style="font-size:11px;color:var(--text-muted)">${p.id}</div>
    </td>
    <td><span class="badge ${metodeBadge}">${p.metode}</span></td>
    <td style="font-size:12px;white-space:normal">${tgl}</td>
    <td style="text-align:center">
      <div style="font-weight:700;font-size:15px;color:var(--color-success)">${formatNumber(p.lulus)}</div>
    </td>
    <td style="text-align:center">
      <div style="font-weight:700;color:var(--color-danger)">${formatNumber(p.tidakLulus)}</div>
    </td>
    <td style="text-align:center">
      <div style="font-weight:700;color:var(--color-secondary)">${formatNumber(p.jumlahPeserta)}</div>
    </td>
    <td><span class="badge ${prosesBadge}">${p.proses}</span></td>
    <td style="font-size:12px;max-width:200px;white-space:normal;word-break:break-word;line-height:1.4;color:var(--text-secondary)">${p.keterangan || "-"}</td>
    <td style="font-size:12px;white-space:nowrap">${p.lokasiPelatihan || "-"}</td>
    <td style="font-size:12px;max-width:140px;white-space:normal;word-break:break-word;color:var(--text-secondary)">${p.pic || "-"}</td>
    <td>${evidenLink}</td>
  </tr>`;
    })
    .join("");
}

/* ----- Ranking / Statistik Table ----- */
function renderRankingTable() {
  const tbody = document.getElementById("ranking-tbody");
  const webinars = window.AppData.stats.topByYT || [];
  if (!tbody) return;

  if (!webinars.length) {
    tbody.innerHTML = emptyRow(7, "bar-chart", "Belum ada data penonton.");
    return;
  }

  tbody.innerHTML = webinars
    .map((w, i) => {
      const badgeCls = getStatusBadgeWebinar(w.status);
      const rankIcon =
        i === 0
          ? '<i class="bi bi-trophy-fill" style="color:#D97706;font-size:16px"></i>'
          : i === 1
            ? '<i class="bi bi-trophy-fill" style="color:#9CA3AF;font-size:15px"></i>'
            : i === 2
              ? '<i class="bi bi-trophy-fill" style="color:#B45309;font-size:15px"></i>'
              : `<span style="font-weight:700;color:var(--text-muted)">${i + 1}</span>`;

      return `
      <tr>
        <td style="text-align:center">${rankIcon}</td>
        <td>
          <div style="font-weight:700;line-height:1.4;margin-bottom:2px">${w.nama}</div>
          <div style="font-size:11px;color:var(--text-muted)">${w.id}</div>
        </td>
        <td style="white-space:nowrap;font-size:12px">${formatTanggal(w.tanggal)}</td>
        <td style="text-align:center">
          <div style="font-weight:800;font-size:16px;color:#DC2626">${formatNumber(w.jumlahMenontonYT)}</div>
        </td>
        <td style="text-align:center">
          <div style="font-weight:700;font-size:15px;color:#2D8CFF">${formatNumber(w.jumlahMenontonZoom)}</div>
        </td>
        <td style="text-align:center">
          <div style="font-weight:700;color:var(--color-success)">${formatNumber(w.jumlahPenerimaSertifikat)}</div>
        </td>
        <td><span class="badge ${badgeCls}">${w.status}</span></td>
      </tr>`;
    })
    .join("");

  // Top 3 highlight cards
  renderTop3Cards(webinars.slice(0, 3));
}

/* ----- Top 3 Cards (Statistik) ----- */
function renderTop3Cards(top3) {
  const container = document.getElementById("top3-cards");
  if (!container) return;

  const medals = [
    { icon: "trophy-fill", color: "#D97706", bg: "#FEF3C7", label: "🥇 #1 Terbanyak" },
    { icon: "trophy-fill", color: "#6B7280", bg: "#F3F4F6", label: "🥈 #2 Terbanyak" },
    { icon: "trophy-fill", color: "#B45309", bg: "#FEF9C3", label: "🥉 #3 Terbanyak" },
  ];

  container.innerHTML = top3
    .map((w, i) => {
      const m = medals[i];
      return `
      <div class="stat-card" style="cursor:default;border-top:3px solid ${m.color}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <div style="width:32px;height:32px;border-radius:8px;background:${m.bg};display:flex;align-items:center;justify-content:center">
            <i class="bi bi-${m.icon}" style="color:${m.color};font-size:16px"></i>
          </div>
          <span style="font-size:11px;font-weight:700;color:${m.color}">${m.label}</span>
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);line-height:1.4;margin-bottom:10px">
          ${w.nama.length > 60 ? w.nama.substring(0, 60) + "…" : w.nama}
        </div>
        <div style="display:flex;gap:16px">
          <div>
            <div style="font-size:10px;color:var(--text-muted)"><i class="bi bi-youtube" style="color:#FF0000"></i> YouTube</div>
            <div style="font-size:18px;font-weight:800;color:#DC2626">${formatNumber(w.jumlahMenontonYT)}</div>
          </div>
          <div>
            <div style="font-size:10px;color:var(--text-muted)"><i class="bi bi-camera-video-fill" style="color:#2D8CFF"></i> Zoom</div>
            <div style="font-size:18px;font-weight:800;color:#2D8CFF">${formatNumber(w.jumlahMenontonZoom)}</div>
          </div>
        </div>
      </div>`;
    })
    .join("");
}

/* =====================================================
   6. BADGE HELPERS
   ===================================================== */

function getStatusBadgeWebinar(status) {
  switch (status) {
    case "Selesai":
      return "badge-success";
    case "Sedang Berlangsung":
      return "badge-warning";
    case "Akan Datang":
      return "badge-secondary";
    default:
      return "badge-muted";
  }
}

function getProsesBadge(proses) {
  switch (proses) {
    case "Telah Terselenggara":
      return "badge-success";
    case "Sedang Berlangsung":
      return "badge-warning";
    case "Akan Datang":
      return "badge-secondary";
    default:
      return "badge-muted";
  }
}

function getMetodeBadge(metode) {
  switch (metode) {
    case "Blended Learning":
      return "badge-primary";
    case "MOOC":
      return "badge-info";
    case "Klasikal":
      return "badge-secondary";
    default:
      return "badge-muted";
  }
}

function emptyRow(colspan, icon, text) {
  return `<tr><td colspan="${colspan}">
    <div class="empty-state">
      <div class="empty-icon"><i class="bi bi-${icon}"></i></div>
      <div class="empty-title">${text}</div>
    </div>
  </td></tr>`;
}

/* =====================================================
   7. AUTO-REFRESH
   ===================================================== */

let autoRefreshTimer = null;

function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(() => {
    console.log("[AutoRefresh] Memperbarui data...");
    loadData();
  }, CONFIG.REFRESH_INTERVAL);
  console.log(`[AutoRefresh] Aktif. Interval: ${CONFIG.REFRESH_INTERVAL / 1000}s`);
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

/* =====================================================
   8. UI HELPERS
   ===================================================== */

function showLoadingState() {
  document.getElementById("loading-overlay")?.classList.add("visible");
}

function hideLoadingState() {
  document.getElementById("loading-overlay")?.classList.remove("visible");
}

function showErrorState(msg) {
  const el = document.getElementById("global-error");
  if (!el) return;
  el.innerHTML = `
    <div class="error-state">
      <div class="error-icon"><i class="bi bi-exclamation-triangle-fill"></i></div>
      <div class="error-title">Gagal mengambil data.</div>
      <div class="error-desc">Silakan coba beberapa saat lagi.<br><small style="opacity:.6">${msg}</small></div>
      <button class="btn btn-primary" onclick="loadData()" style="margin-top:16px">
        <i class="bi bi-arrow-clockwise"></i> Coba Lagi
      </button>
    </div>`;
  el.style.display = "block";
}

function updateRefreshBar(status) {
  const bar = document.getElementById("refresh-bar");
  if (!bar) return;
  if (status === "success") {
    bar.classList.remove("hidden", "error");
    bar.innerHTML = `
      <div class="refresh-pulse"></div>
      <i class="bi bi-check-circle-fill"></i>
      Data berhasil disinkronkan — ${formatWaktu(new Date())}
      <span style="margin-left:auto;opacity:.7">Auto-refresh: ${CONFIG.REFRESH_INTERVAL / 1000}s</span>`;
    setTimeout(() => bar.classList.add("hidden"), 5000);
  } else {
    bar.classList.remove("hidden");
    bar.classList.add("error");
    bar.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> Gagal sinkronisasi. Mencoba ulang...`;
  }
}

function showToast(type, title, msg, duration = 4000) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const icons = { success: "check-circle-fill", error: "x-circle-fill", info: "info-circle-fill" };
  const colors = { success: "var(--color-success)", error: "var(--color-danger)", info: "var(--color-secondary)" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon" style="color:${colors[type] || "var(--color-primary)"}">
      <i class="bi bi-${icons[type] || "info-circle-fill"}"></i>
    </div>
    <div class="toast-text">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ""}
    </div>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text-muted);font-size:16px;cursor:pointer;padding:0 4px" aria-label="Tutup">
      <i class="bi bi-x"></i>
    </button>`;
  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(20px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

/* =====================================================
   9. WAKTU UTILITIES
   ===================================================== */

function formatWaktu(date) {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/* =====================================================
   10. ALUMNI SEARCH & RENDER
   ===================================================== */

/**
 * Dropdown Unit Kerja dan Provinsi dari data alumni.
 */
function populateAlumniDropdowns() {
  const rekapAlumni = window.AppData.rekapAlumni || [];
  const alumni      = window.AppData.alumni      || [];

  const unitKerjaSet = new Set();
  const provinsiSet  = new Set();

  if (rekapAlumni.length > 0) {
    // Prioritaskan data dari Rekap_Alumni (daftar lengkap unit kerja ATR/BPN)
    rekapAlumni.forEach(r => {
      if (r.unitKerja) unitKerjaSet.add(r.unitKerja);
      if (r.provinsi)  provinsiSet.add(r.provinsi);
    });
  } else {
    // Fallback: ambil dari data alumni jika rekapAlumni belum tersedia
    alumni.forEach(a => {
      if (a.unitKerja) unitKerjaSet.add(a.unitKerja);
      if (a.provinsi)  provinsiSet.add(a.provinsi);
    });
  }

  // Simpan nilai yang sudah dipilih
  const currentUK   = document.getElementById('alumni-filter-unit-kerja')?.value || '';
  const currentProv = document.getElementById('alumni-filter-provinsi')?.value  || '';

  // Isi dropdown
  if (typeof sdPopulate === 'function') {
    sdPopulate('unit-kerja', [...unitKerjaSet].sort(), 'Semua Unit Kerja');
    sdPopulate('provinsi',   [...provinsiSet].sort(),   'Semua Provinsi');

    // Restore pilihan sebelumnya jika masih ada
    if (currentUK && typeof sdSetValue === 'function') {
      sdSetValue('unit-kerja', currentUK, currentUK);
    }
    if (currentProv && typeof sdSetValue === 'function') {
      sdSetValue('provinsi', currentProv, currentProv);
    }
  }
}


/**
 * Cari alumni berdasarkan query, unitKerja, dan provinsi.
 */
function searchAlumni(query, unitKerja, provinsi) {
  const alumni = window.AppData.alumni || [];
  const q = (query || '').toLowerCase().trim();

  return alumni.filter(a => {
    const matchQuery = !q ||
      a.nip.toLowerCase().includes(q) ||
      a.nama.toLowerCase().includes(q);
    const matchUK   = !unitKerja || a.unitKerja === unitKerja;
    const matchProv = !provinsi  || a.provinsi  === provinsi;
    return matchQuery && matchUK && matchProv;
  });
}

/**
 * Render tabel hasil pencarian alumni.
 */
function renderAlumniResults(results) {
  const tbody    = document.getElementById('alumni-result-tbody');
  const section  = document.getElementById('alumni-result-section');
  const countEl  = document.getElementById('alumni-result-count');

  if (!tbody || !section) return;

  section.style.display = 'block';

  if (!results || results.length === 0) {
    if (countEl) countEl.textContent = '0 alumni ditemukan';
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <div class="empty-icon"><i class="bi bi-person-x"></i></div>
            <div class="empty-title">Tidak ada alumni yang ditemukan.</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:4px">Coba ubah kata kunci atau filter pencarian.</div>
          </div>
        </td>
      </tr>`;
    return;
  }

  if (countEl) countEl.textContent = `${results.length} alumni ditemukan`;

  tbody.innerHTML = results.map((a, i) => `
    <tr>
      <td style="text-align:center;font-weight:700;color:var(--text-muted)">${i + 1}</td>
      <td style="font-family:monospace;font-size:13px;white-space:nowrap;font-weight:600;color:var(--text-primary)">${a.nip || '—'}</td>
      <td style="font-weight:700;color:var(--text-primary);white-space:nowrap">${a.nama || '—'}</td>
      <td style="font-size:12px;white-space:normal;min-width:180px;color:var(--text-primary)">${a.jabatan || '—'}</td>
      <td style="font-size:12px;white-space:normal;min-width:180px">${a.unitKerja || '—'}</td>
      <td style="font-size:12px;white-space:nowrap">${a.provinsi || '—'}</td>
      <td style="font-size:12px;white-space:normal;min-width:120px;color:var(--text-secondary)">${a.pkp || '—'}</td>
      <td style="font-size:12px;white-space:normal;min-width:120px;color:var(--text-secondary)">${a.pka || '—'}</td>
    </tr>`).join('');
}

/* =====================================================
   11. EXPORTS
   ===================================================== */
window.loadData = loadData;
window.fetchSpreadsheet = fetchSpreadsheet;
window.updateDashboard = updateDashboard;
window.renderTable = renderTable;
window.startAutoRefresh = startAutoRefresh;
window.stopAutoRefresh = stopAutoRefresh;
window.showToast = showToast;
window.formatTanggal = formatTanggal;
window.formatNumber = formatNumber;
window.renderRankingTable = renderRankingTable;
window.populateAlumniDropdowns = populateAlumniDropdowns;
window.searchAlumni = searchAlumni;
window.renderAlumniResults = renderAlumniResults;

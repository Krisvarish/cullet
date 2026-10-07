/**
 * CULLET — Optical Material Inspection & Municipal Sorting Archive
 * Client-Side Controller & Telemetry Engine — Folio Edition
 */

// DOM Elements — Platen (Scanner Intake)
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const cameraInput = document.getElementById('cameraInput');
const uploadLabel = document.getElementById('uploadLabel');
const cameraLabel = document.getElementById('cameraLabel');
const clearBtn = document.getElementById('clearBtn');
const preview = document.getElementById('preview');
const scannerEmpty = document.getElementById('scannerEmpty');
const scanLaser = document.getElementById('scanLaser');
const scanningOverlay = document.getElementById('scanningOverlay');
const scannerBadge = document.getElementById('scannerBadge');
const errorBanner = document.getElementById('errorBanner');
const errorMessage = document.getElementById('errorMessage');
const dismissErrorBtn = document.getElementById('dismissErrorBtn');

// DOM Elements — Specimen Sheet (Result Reveal)
const ticketIdle = document.getElementById('ticketIdle');
const ticketUncertain = document.getElementById('ticketUncertain');
const ticketBody = document.getElementById('ticketBody');
const ticketSerial = document.getElementById('ticketSerial');
const scanTimestamp = document.getElementById('scanTimestamp');
const categoryHero = document.getElementById('categoryHero');
const categoryIconFrame = document.getElementById('categoryIconFrame');
const categoryConfidenceScore = document.getElementById('categoryConfidenceScore');
const itemName = document.getElementById('itemName');
const categoryMeterFill = document.getElementById('categoryMeterFill');
const binSwatch = document.getElementById('binSwatch');
const binName = document.getElementById('binName');
const itemMaterial = document.getElementById('itemMaterial');
const materialConfidenceBadge = document.getElementById('materialConfidenceBadge');
const tipText = document.getElementById('tipText');
const altList = document.getElementById('altList');
const uncertainMaterial = document.getElementById('uncertainMaterial');
const uncertainConfidence = document.getElementById('uncertainConfidence');

// DOM Elements — Session Field Ledger (Analytics)
const dashTotal = document.getElementById('dashTotal');
const dashBio = document.getElementById('dashBio');
const dashBioPct = document.getElementById('dashBioPct');
const dashRec = document.getElementById('dashRec');
const dashRecPct = document.getElementById('dashRecPct');
const dashHaz = document.getElementById('dashHaz');
const dashHazPct = document.getElementById('dashHazPct');
const dashNon = document.getElementById('dashNon');
const dashNonPct = document.getElementById('dashNonPct');
const distroCaption = document.getElementById('distroCaption');
const segBio = document.getElementById('segBio');
const segRec = document.getElementById('segRec');
const segHaz = document.getElementById('segHaz');
const segNon = document.getElementById('segNon');
const legBioPct = document.getElementById('legBioPct');
const legRecPct = document.getElementById('legRecPct');
const legHazPct = document.getElementById('legHazPct');
const legNonPct = document.getElementById('legNonPct');
const navHistoryCount = document.getElementById('navHistoryCount');

// Four Stream Section Live Tallies
const streamCountBio = document.getElementById('streamCountBio');
const streamCountRec = document.getElementById('streamCountRec');
const streamCountHaz = document.getElementById('streamCountHaz');
const streamCountNon = document.getElementById('streamCountNon');

// DOM Elements — Chronological Archive
const historyList = document.getElementById('historyList');
const historyEmpty = document.getElementById('historyEmpty');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// State Variables
let isAnalyzing = false;
let sessionHistory = [];

try {
  sessionHistory = JSON.parse(localStorage.getItem('cullet_scans_v2') || '[]');
} catch (e) {
  sessionHistory = [];
}

let ticketCount = sessionHistory.length;

// Earthy & Natural SVG Icons for the Four Categories
const CATEGORY_ICONS = {
  'Biodegradable': `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#476249" stroke-width="1.8" aria-hidden="true">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
    </svg>
  `,
  'Recyclable': `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3A5E6D" stroke-width="1.8" aria-hidden="true">
      <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/>
      <path d="M11 19h8.2a1.8 1.8 0 0 0 1.55-.89 1.8 1.8 0 0 0 0-1.78L16.8 9.5"/>
      <path d="M15.5 4.5 12 2 8.5 4.5"/>
      <path d="M12 2v6.5"/>
      <path d="m3.5 14 1.5 2.5 3-1"/>
      <path d="m20.5 14-1.5 2.5-3-1"/>
    </svg>
  `,
  'Hazardous': `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B45E3D" stroke-width="1.8" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  `,
  'Non-biodegradable': `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6D6356" stroke-width="1.8" aria-hidden="true">
      <path d="M3 6h18"/>
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
      <line x1="10" y1="11" x2="10" y2="17"/>
      <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
  `
};

/**
 * Reusable general formatter for machine class identifiers
 */
function formatClassName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Helper to slugify category names for CSS styling
 */
function getCategoryClass(category) {
  if (!category) return 'cat-non-biodegradable';
  const norm = category.toLowerCase().trim();
  if (norm.includes('bio') && !norm.includes('non')) return 'cat-biodegradable';
  if (norm.includes('recyc')) return 'cat-recyclable';
  if (norm.includes('haz')) return 'cat-hazardous';
  return 'cat-non-biodegradable';
}

/**
 * Generate lightweight 64x64 thumbnail data URL via offscreen canvas
 */
function generateThumbnail(file) {
  return new Promise(resolve => {
    try {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = e => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 64;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, 64, 64);
          resolve(canvas.toDataURL('image/jpeg', 0.65));
        };
        img.onerror = () => resolve(null);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    } catch {
      resolve(null);
    }
  });
}

// ==========================================================================
// DRAG & DROP AND WINDOW EVENT LISTENERS
// ==========================================================================

['dragover', 'drop'].forEach(evt => {
  window.addEventListener(evt, e => e.preventDefault(), false);
});

function openPicker() {
  if (isAnalyzing) return;
  fileInput.click();
}

dropzone.addEventListener('click', openPicker);
dropzone.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openPicker();
  }
});

['dragover'].forEach(evt =>
  dropzone.addEventListener(evt, e => {
    e.preventDefault();
    if (!isAnalyzing) dropzone.classList.add('drag');
  })
);

['dragleave', 'drop'].forEach(evt =>
  dropzone.addEventListener(evt, () => dropzone.classList.remove('drag'))
);

dropzone.addEventListener('drop', e => {
  e.preventDefault();
  if (isAnalyzing) return;
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener('change', () => {
  if (isAnalyzing) return;
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

cameraInput.addEventListener('change', () => {
  if (isAnalyzing) return;
  if (cameraInput.files[0]) handleFile(cameraInput.files[0]);
});

clearBtn.addEventListener('click', e => {
  e.stopPropagation();
  if (isAnalyzing) return;
  resetScanner();
});

if (dismissErrorBtn) {
  dismissErrorBtn.addEventListener('click', () => {
    errorBanner.hidden = true;
  });
}

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', () => {
    sessionHistory = [];
    localStorage.removeItem('cullet_scans_v2');
    updateDashboard();
    renderHistory();
  });
}

// ==========================================================================
// STATE MANAGEMENT & WORKFLOW CONTROLS
// ==========================================================================

function setScanningState(scanning) {
  isAnalyzing = scanning;
  if (scanning) {
    dropzone.classList.add('scanning');
    if (scanLaser) scanLaser.hidden = false;
    if (scanningOverlay) scanningOverlay.hidden = false;
    fileInput.disabled = true;
    cameraInput.disabled = true;
    clearBtn.disabled = true;
    if (uploadLabel) uploadLabel.classList.add('disabled');
    if (cameraLabel) cameraLabel.classList.add('disabled');
    clearBtn.classList.add('disabled');
    if (scannerBadge) scannerBadge.textContent = 'EXPOSING SPECIMEN';
    hideError();
  } else {
    dropzone.classList.remove('scanning');
    if (scanLaser) scanLaser.hidden = true;
    if (scanningOverlay) scanningOverlay.hidden = true;
    fileInput.disabled = false;
    cameraInput.disabled = false;
    clearBtn.disabled = false;
    if (uploadLabel) uploadLabel.classList.remove('disabled');
    if (cameraLabel) cameraLabel.classList.remove('disabled');
    clearBtn.classList.remove('disabled');
  }
}

function clearTicket() {
  ticketIdle.hidden = false;
  ticketUncertain.hidden = true;
  ticketBody.hidden = true;
  itemName.textContent = '—';
  itemMaterial.textContent = '—';
  binSwatch.style.backgroundColor = 'transparent';
  binName.textContent = '—';
  categoryConfidenceScore.textContent = '0.0% Aggregate Confidence';
  materialConfidenceBadge.textContent = '0.0% material confidence';
  categoryMeterFill.style.width = '0%';
  tipText.textContent = '—';
  altList.innerHTML = '';
  categoryHero.className = 'stream-reveal-card';
}

function showError(msg) {
  if (errorBanner && errorMessage) {
    errorMessage.textContent = msg;
    errorBanner.hidden = false;
  }
}

function hideError() {
  if (errorBanner) {
    errorBanner.hidden = true;
  }
}

function resetScanner() {
  if (isAnalyzing) return;
  if (preview.src && preview.src.startsWith('blob:')) {
    URL.revokeObjectURL(preview.src);
  }
  preview.src = '';
  preview.hidden = true;
  scannerEmpty.hidden = false;
  clearBtn.hidden = true;
  if (scannerBadge) scannerBadge.textContent = 'PLATEN VACANT';
  hideError();
  clearTicket();
  fileInput.value = '';
  cameraInput.value = '';
}

// ==========================================================================
// FILE HANDLING & PREDICTION
// ==========================================================================

async function handleFile(file) {
  if (isAnalyzing) return;

  // Validate format early on client
  if (!file.type.startsWith('image/')) {
    showError('Unsupported file type. Please mount a JPEG, PNG, or WEBP image.');
    return;
  }

  // Validate size early on client
  if (file.size > 16 * 1024 * 1024) {
    showError('File size exceeds the 16MB limit. Please mount a smaller photographic specimen.');
    return;
  }

  if (preview.src && preview.src.startsWith('blob:')) {
    URL.revokeObjectURL(preview.src);
  }

  const url = URL.createObjectURL(file);
  preview.src = url;
  preview.hidden = false;
  scannerEmpty.hidden = true;
  clearBtn.hidden = false;

  clearTicket();
  setScanningState(true);

  // Generate thumbnail asynchronously for archival log
  const thumbPromise = generateThumbnail(file);

  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch('/predict', { method: 'POST', body: formData });
    const data = await res.json();

    setScanningState(false);

    if (!res.ok) {
      clearTicket();
      if (scannerBadge) scannerBadge.textContent = 'INTAKE ERROR';
      showError(data.error || 'Could not classify specimen.');
      return;
    }

    if (scannerBadge) scannerBadge.textContent = 'SPECIMEN EVALUATED';
    hideError();

    const thumbnail = await thumbPromise;
    renderTicket(data, thumbnail);
  } catch {
    setScanningState(false);
    clearTicket();
    if (scannerBadge) scannerBadge.textContent = 'SERVER DISCONNECTED';
    showError('Could not reach the classification model — is the Flask server running?');
  }
}

// ==========================================================================
// RESULT RENDERING & CATEGORY IDENTITY (THE REVEAL)
// ==========================================================================

function renderTicket(data, thumbnail) {
  ticketCount += 1;
  const serialStr = '#' + String(ticketCount).padStart(5, '0');
  ticketSerial.textContent = serialStr;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  scanTimestamp.textContent = timeStr;

  const top = data.result;
  const formattedMaterial = top.formatted_label || formatClassName(top.label);
  const categoryConfidence = top.category_confidence || 0;
  const materialConfidence = top.confidence || 0;

  // LOW-CONFIDENCE / QUARANTINE THRESHOLD CHECK
  if (materialConfidence < 35.0 && categoryConfidence < 45.0) {
    ticketIdle.hidden = true;
    ticketBody.hidden = true;
    ticketUncertain.hidden = false;
    if (scannerBadge) scannerBadge.textContent = 'QUARANTINED';

    if (uncertainMaterial) uncertainMaterial.textContent = formattedMaterial;
    if (uncertainConfidence) uncertainConfidence.textContent = `${materialConfidence}% confidence`;

    saveToHistory({
      id: Date.now(),
      serial: serialStr,
      material: formattedMaterial,
      materialConfidence,
      category: top.category,
      categoryConfidence,
      bin: top.bin,
      color: top.color,
      timestamp: timeStr,
      thumbnail: thumbnail || null,
      uncertain: true
    });
    return;
  }

  // CONFIRMED SPECIMEN DIRECTIVE (REVEAL)
  ticketIdle.hidden = true;
  ticketUncertain.hidden = true;
  ticketBody.hidden = false;

  // 1. Waste Category Reveal Hero
  itemName.textContent = top.category.toUpperCase();
  categoryHero.className = 'stream-reveal-card ' + getCategoryClass(top.category);

  // Injected category SVG
  if (CATEGORY_ICONS[top.category]) {
    categoryIconFrame.innerHTML = CATEGORY_ICONS[top.category];
  }

  categoryConfidenceScore.textContent = `${categoryConfidence}% Aggregate Confidence`;
  categoryMeterFill.style.width = `${Math.min(100, categoryConfidence)}%`;

  // 2. Physical Receptacle Card
  binName.textContent = top.bin;
  binSwatch.style.backgroundColor = top.color || '#3A5E6D';

  // 3. Material Substance Card
  itemMaterial.textContent = formattedMaterial;
  materialConfidenceBadge.textContent = `${materialConfidence}% material confidence`;

  // 4. Actionable Handling Protocol
  tipText.textContent = top.tip;

  // 5. Top 3 Spectral Predictions
  altList.innerHTML = '';
  data.top.slice(0, 3).forEach((entry, idx) => {
    const row = document.createElement('div');
    row.className = 'candidate-row' + (idx === 0 ? ' primary' : '');
    const rank = String(idx + 1).padStart(2, '0');
    const candName = entry.formatted_label || formatClassName(entry.label);
    const catClass = getCategoryClass(entry.category);

    row.innerHTML = `
      <span class="cand-rank">${rank}</span>
      <span class="cand-name">${candName}</span>
      <span class="cand-cat-tag ${catClass}">${entry.category}</span>
      <span class="cand-pct">${entry.confidence}%</span>
    `;
    altList.appendChild(row);
  });

  // Save successful scan to session history
  saveToHistory({
    id: Date.now(),
    serial: serialStr,
    material: formattedMaterial,
    materialConfidence,
    category: top.category,
    categoryConfidence,
    bin: top.bin,
    color: top.color,
    timestamp: timeStr,
    thumbnail: thumbnail || null,
    uncertain: false
  });
}

// ==========================================================================
// SESSION FIELD LEDGER & ARCHIVE ENGINE
// ==========================================================================

function saveToHistory(item) {
  sessionHistory.unshift(item);
  if (sessionHistory.length > 50) sessionHistory.pop();

  try {
    localStorage.setItem('cullet_scans_v2', JSON.stringify(sessionHistory));
  } catch (e) {
    sessionHistory.forEach(s => delete s.thumbnail);
    try {
      localStorage.setItem('cullet_scans_v2', JSON.stringify(sessionHistory));
    } catch {}
  }

  updateDashboard();
  renderHistory();
}

function updateDashboard() {
  const total = sessionHistory.length;
  if (navHistoryCount) navHistoryCount.textContent = total;

  let bio = 0, rec = 0, haz = 0, non = 0;

  sessionHistory.forEach(item => {
    const cat = (item.category || '').toLowerCase();
    if (cat.includes('bio') && !cat.includes('non')) bio++;
    else if (cat.includes('recyc')) rec++;
    else if (cat.includes('haz')) haz++;
    else non++;
  });

  if (dashTotal) dashTotal.textContent = total;
  if (dashBio) dashBio.textContent = bio;
  if (dashRec) dashRec.textContent = rec;
  if (dashHaz) dashHaz.textContent = haz;
  if (dashNon) dashNon.textContent = non;

  // Update Live Stream Columns in Section 2
  if (streamCountBio) streamCountBio.textContent = bio;
  if (streamCountRec) streamCountRec.textContent = rec;
  if (streamCountHaz) streamCountHaz.textContent = haz;
  if (streamCountNon) streamCountNon.textContent = non;

  const bioPct = total > 0 ? Math.round((bio / total) * 100) : 0;
  const recPct = total > 0 ? Math.round((rec / total) * 100) : 0;
  const hazPct = total > 0 ? Math.round((haz / total) * 100) : 0;
  const nonPct = total > 0 ? Math.max(0, 100 - (bioPct + recPct + hazPct)) : 0;

  if (dashBioPct) dashBioPct.textContent = `${bioPct}% of total`;
  if (dashRecPct) dashRecPct.textContent = `${recPct}% of total`;
  if (dashHazPct) dashHazPct.textContent = `${hazPct}% of total`;
  if (dashNonPct) dashNonPct.textContent = `${nonPct}% of total`;

  if (total === 0) {
    if (distroCaption) distroCaption.textContent = '0 classified items';
    if (segBio) segBio.style.width = '25%';
    if (segRec) segRec.style.width = '25%';
    if (segHaz) segHaz.style.width = '25%';
    if (segNon) segNon.style.width = '25%';
    if (legBioPct) legBioPct.textContent = '0%';
    if (legRecPct) legRecPct.textContent = '0%';
    if (legHazPct) legHazPct.textContent = '0%';
    if (legNonPct) legNonPct.textContent = '0%';
  } else {
    if (distroCaption) distroCaption.textContent = `${total} classified items in session`;
    if (segBio) segBio.style.width = `${bioPct}%`;
    if (segRec) segRec.style.width = `${recPct}%`;
    if (segHaz) segHaz.style.width = `${hazPct}%`;
    if (segNon) segNon.style.width = `${nonPct}%`;
    if (legBioPct) legBioPct.textContent = `${bioPct}%`;
    if (legRecPct) legRecPct.textContent = `${recPct}%`;
    if (legHazPct) legHazPct.textContent = `${hazPct}%`;
    if (legNonPct) legNonPct.textContent = `${nonPct}%`;
  }
}

function renderHistory() {
  if (!historyList || !historyEmpty) return;

  if (sessionHistory.length === 0) {
    historyList.innerHTML = '';
    historyEmpty.hidden = false;
    return;
  }

  historyEmpty.hidden = true;
  historyList.innerHTML = '';

  sessionHistory.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-item';

    const thumbHtml = item.thumbnail
      ? `<img src="${item.thumbnail}" alt="${item.material}" class="hist-thumb">`
      : `<div class="hist-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--ink-muted)">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
             <path d="M4 16.5V6.5a1 1 0 0 1 1-1h4.2l1.6 2h8.2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/>
           </svg>
         </div>`;

    const badgeClass = item.category === 'Biodegradable' ? 'badge-bio'
      : item.category === 'Recyclable' ? 'badge-rec'
      : item.category === 'Hazardous' ? 'badge-haz'
      : 'badge-non';

    el.innerHTML = `
      ${thumbHtml}
      <div class="hist-info">
        <div class="hist-top-line">
          <span class="hist-material">${item.material}</span>
          <span class="hist-badge ${badgeClass}">${item.category}</span>
          ${item.uncertain ? '<span class="hist-badge" style="background:var(--stream-haz-wash);color:var(--stream-haz-ink)">Quarantine</span>' : ''}
        </div>
        <div class="hist-bin">${item.bin}</div>
      </div>
      <div class="hist-metrics">
        <div class="hist-confidence">${item.materialConfidence}%</div>
        <div class="hist-time">${item.timestamp}</div>
      </div>
    `;

    historyList.appendChild(el);
  });
}

// ==========================================================================
// SCROLLSPY NAVIGATION
// ==========================================================================

const indexAnchors = document.querySelectorAll('.index-anchor');
const folioSections = document.querySelectorAll('section[id]');

function updateActiveNav() {
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  let activeId = '';

  folioSections.forEach(sec => {
    const sectionTop = sec.offsetTop - 160;
    if (scrollY >= sectionTop) {
      activeId = sec.getAttribute('id');
    }
  });

  if (activeId) {
    indexAnchors.forEach(link => {
      const isMatch = link.getAttribute('href') === `#${activeId}`;
      link.classList.toggle('active', isMatch);
    });
  }
}

window.addEventListener('scroll', updateActiveNav, { passive: true });

// Initialize Ledger & History on page load
updateDashboard();
renderHistory();

// ==========================================================================
// AMBIENT INTERACTIVE TACTILE DOT GRID (MOUSE CONCENTRATION ENGINE)
// ==========================================================================

function initAmbientGridCanvas() {
  const canvas = document.getElementById('ambientGridCanvas');
  if (!canvas) return;

  // Honor prefers-reduced-motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const SPACING = 36;
  const INFLUENCE_RADIUS = 190;
  const MAX_PULL = 15;
  const BASE_RADIUS = 1.15;
  const BASE_ALPHA = 0.12;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let nodes = [];
  let isRunning = false;

  const mouse = {
    x: -9999,
    y: -9999,
    active: false
  };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    nodes = [];
    const cols = Math.ceil(width / SPACING) + 1;
    const rows = Math.ceil(height / SPACING) + 1;
    const offsetX = (width - (cols - 1) * SPACING) / 2;
    const offsetY = (height - (rows - 1) * SPACING) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bx = Math.round(offsetX + c * SPACING);
        const by = Math.round(offsetY + r * SPACING);
        nodes.push({
          bx,
          by,
          x: bx,
          y: by,
          r: BASE_RADIUS,
          a: BASE_ALPHA
        });
      }
    }

    wake();
  }

  function wake() {
    if (!isRunning) {
      isRunning = true;
      requestAnimationFrame(tick);
    }
  }

  function tick() {
    let maxDisplacement = 0;

    ctx.clearRect(0, 0, width, height);

    // 1. Subtle warm ambient paper spotlight under cursor
    if (mouse.active && mouse.x >= 0 && mouse.x <= width && mouse.y >= 0 && mouse.y <= height) {
      const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 230);
      grad.addColorStop(0, 'rgba(198, 154, 88, 0.055)');
      grad.addColorStop(0.45, 'rgba(180, 94, 61, 0.02)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(mouse.x - 230, mouse.y - 230, 460, 460);
    }

    // 2. Physics & draw dots
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      let targetX = node.bx;
      let targetY = node.by;
      let targetR = BASE_RADIUS;
      let targetA = BASE_ALPHA;

      if (mouse.active) {
        const dx = mouse.x - node.bx;
        const dy = mouse.y - node.by;
        const dist = Math.hypot(dx, dy);

        if (dist < INFLUENCE_RADIUS) {
          const norm = 1 - dist / INFLUENCE_RADIUS;
          const pull = Math.pow(norm, 1.8) * MAX_PULL;
          const angle = Math.atan2(dy, dx);

          // Gently pull dots closer to cursor ("concentrate")
          targetX = node.bx + Math.cos(angle) * pull;
          targetY = node.by + Math.sin(angle) * pull;
          targetR = BASE_RADIUS + norm * 1.5;
          targetA = BASE_ALPHA + norm * 0.42;
        }
      }

      // Smooth damping interpolation
      node.x += (targetX - node.x) * 0.16;
      node.y += (targetY - node.y) * 0.16;
      node.r += (targetR - node.r) * 0.16;
      node.a += (targetA - node.a) * 0.16;

      const diff = Math.abs(node.x - targetX) + Math.abs(node.y - targetY);
      if (diff > maxDisplacement) maxDisplacement = diff;

      ctx.fillStyle = `rgba(33, 30, 26, ${node.a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Auto-sleep when settled to preserve CPU and battery
    if (!mouse.active && maxDisplacement < 0.08) {
      isRunning = false;
      return;
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener('pointermove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
    wake();
  }, { passive: true });

  window.addEventListener('pointerleave', () => {
    mouse.active = false;
    wake();
  }, { passive: true });

  window.addEventListener('resize', resize, { passive: true });

  // Initial setup
  resize();
}

initAmbientGridCanvas();


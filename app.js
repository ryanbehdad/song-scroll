/* Song Scroll — PWA-friendly chord/lyrics viewer with auto-scroll
   - Continuous (px/s) or step (line/page every X seconds)
   - Song list drawer + search
   - Settings dialog
   - Optional Wake Lock to keep screen on (Android Chrome supports it)
*/

const $ = (sel) => document.querySelector(sel);

const viewer = $('#viewer');
const songTitleEl = $('#songTitle');
const songArtistEl = $('#songArtist');

const songsDialog = $('#songsDialog');
const songListEl = $('#songList');
const songSearchEl = $('#songSearch');

const settingsDialog = $('#settingsDialog');

const openSongsBtn = $('#openSongs');
const openSettingsBtn = $('#openSettings');

const prevBtn = $('#prev');
const nextBtn = $('#next');
const playPauseBtn = $('#playPause');

const speedDownBtn = $('#speedDown');
const speedUpBtn = $('#speedUp');
const openSpeedBtn = $('#openSpeed');
const speedLabelEl = $('#speedLabel');

const progressFill = $('#progressFill');
const progressText = $('#progressText');

const scrollModeEl = $('#scrollMode');
const speedRangeEl = $('#speedRange');
const stepEveryEl = $('#stepEvery');
const stepSizeEl = $('#stepSize');
const fontSizeEl = $('#fontSize');
const lineHeightEl = $('#lineHeight');
const keepAwakeEl = $('#keepAwake');
const tapTogglesEl = $('#tapToggles');
const swipeNavEl = $('#swipeNav');
const showChordsEl = $('#showChords');

const toTopBtn = $('#toTop');
const fullscreenBtn = $('#fullscreen');

const STORAGE_KEY = 'song_scroll_v2_settings';

let songs = [];
let idx = 0;

let isPlaying = false;
let rafId = null;
let lastTs = null;
let stepAccum = 0;

let wakeLock = null;

const settings = loadSettings();

/* ---------------- settings + state ---------------- */

function defaultSettings() {
  return {
    idx: 0,

    mode: 'smooth',          // smooth | step
    speedPx: 20,             // px/s
    stepEvery: 1.0,          // seconds
    stepSize: 'line',        // line | 2line | page

    fontSize: 20,
    lineHeight: 1.6,

    keepAwake: true,
    tapToggles: true,
    swipeNav: true,
    showChords: true,
  };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw);
    return { ...defaultSettings(), ...parsed };
  } catch {
    return defaultSettings();
  }
}

function saveSettings() {
  try {
    settings.idx = idx;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

function applySettingsToUI() {
  scrollModeEl.value = settings.mode;
  speedRangeEl.value = String(settings.speedPx);
  stepEveryEl.value = String(settings.stepEvery);
  stepSizeEl.value = settings.stepSize;
  fontSizeEl.value = String(settings.fontSize);
  lineHeightEl.value = String(settings.lineHeight);

  keepAwakeEl.checked = !!settings.keepAwake;
  tapTogglesEl.checked = !!settings.tapToggles;
  swipeNavEl.checked = !!settings.swipeNav;
  showChordsEl.checked = !!settings.showChords;

  speedLabelEl.textContent = String(settings.speedPx);
  document.documentElement.style.setProperty('--font-size', settings.fontSize + 'px');
  document.documentElement.style.setProperty('--line-height', String(settings.lineHeight));

  document.documentElement.classList.toggle('no-chords', !settings.showChords);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/* ---------------- songs parsing ---------------- */

function parseHeader(line) {
  const trimmed = (line || '').trim();
  if (!trimmed) return { title: 'Untitled', artist: '' };

  // "Title (Artist)"
  const m = trimmed.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (m) return { title: m[1].trim() || trimmed, artist: m[2].trim() };

  // "Title — Artist" / "Title - Artist"
  const m2 = trimmed.match(/^(.*?)\s*[-–—]\s*(.+)$/);
  if (m2 && m2[1] && m2[2] && m2[2].length < 60) {
    return { title: m2[1].trim(), artist: m2[2].trim() };
  }

  return { title: trimmed, artist: '' };
}

function parseSongsTxt(txt) {
  const parts = txt
    .replace(/\uFEFF/g, '')
    .split(/\r?\n-{8,}\r?\n/)
    .map(p => p.trim())
    .filter(Boolean);

  return parts.map(p => {
    const lines = p.split(/\r?\n/).map(l => l.replace(/\uFEFF/g, '').trimEnd());

    let i = 0;
    while (i < lines.length && lines[i].trim() === '') i++;

    const header = parseHeader(lines[i] || 'Untitled');
    let title = header.title;
    let artist = header.artist;

    let contentStart = i + 1;

    // If we didn't get artist from header, try second line like your current format
    const second = lines[contentStart] || '';
    if (!artist && second && second.length < 60 && second.split(' ').length < 6 && !/\[|\||\|:/.test(second)) {
      artist = second.trim();
      contentStart++;
    }

    const content = lines.slice(contentStart).join('\n').trimEnd();

    return { title, artist, content };
  });
}

/* ---------------- rendering ---------------- */

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function formatLine(line) {
  // Replace [CHORD] chunks with <span class="chord">
  let out = '';
  let last = 0;
  const re = /\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    out += escapeHtml(line.slice(last, m.index));
    out += `<span class=\"chord\">${escapeHtml(m[1])}</span>`;
    last = m.index + m[0].length;
  }
  out += escapeHtml(line.slice(last));
  return out;
}

function songToHtml(song) {
  const titleLine = `<div class=\"line title\">${escapeHtml(song.title)}${song.artist ? ` <span style=\"color:var(--muted);font-weight:650\">— ${escapeHtml(song.artist)}</span>` : ''}</div>`;
  const lines = (song.content || '').split(/\n/).map(l => `<div class=\"line\">${formatLine(l)}</div>`).join('');
  return titleLine + lines;
}

function loadSong(i, { keepScroll = false } = {}) {
  idx = clamp(i, 0, songs.length - 1);
  const s = songs[idx];

  songTitleEl.textContent = s?.title || 'Song Scroll';
  songArtistEl.textContent = s?.artist || '';

  const oldScroll = viewer.scrollTop;

  viewer.innerHTML = s ? songToHtml(s) : '<div class="line">(No songs loaded)</div>';
  viewer.scrollTop = keepScroll ? oldScroll : 0;

  highlightActiveSong();
  updateProgress();
  saveSettings();
}

function highlightActiveSong() {
  const items = songListEl.querySelectorAll('.song-item');
  items.forEach((el) => el.classList.remove('active'));
  const active = songListEl.querySelector(`[data-idx="${idx}"]`);
  if (active) active.classList.add('active');
}

function renderSongList(filterText = '') {
  const q = (filterText || '').trim().toLowerCase();

  songListEl.innerHTML = '';
  songs.forEach((s, i) => {
    const hay = (s.title + ' ' + (s.artist || '')).toLowerCase();
    if (q && !hay.includes(q)) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'song-item';
    btn.dataset.idx = String(i);

    const t = document.createElement('div');
    t.className = 't';
    t.textContent = s.title || 'Untitled';

    const a = document.createElement('div');
    a.className = 'a';
    a.textContent = s.artist || '';

    btn.appendChild(t);
    if (s.artist) btn.appendChild(a);

    btn.addEventListener('click', () => {
      loadSong(i);
      songsDialog.close();
      // if user is playing, keep playing on new song (start from top)
      if (isPlaying) {
        viewer.scrollTop = 0;
        lastTs = null;
      }
    });

    songListEl.appendChild(btn);
  });

  highlightActiveSong();
}

/* ---------------- auto scroll ---------------- */

function maxScrollTop() {
  return Math.max(0, viewer.scrollHeight - viewer.clientHeight);
}

function getLineHeightPx() {
  const lh = parseFloat(getComputedStyle(viewer).lineHeight);
  if (Number.isFinite(lh) && lh > 0) return lh;
  // fallback if line-height is 'normal'
  return settings.fontSize * 1.6;
}

function stepAmountPx() {
  if (settings.stepSize === 'page') return Math.floor(viewer.clientHeight * 0.90);
  const lines = settings.stepSize === '2line' ? 2 : 1;
  return Math.floor(getLineHeightPx() * lines);
}

function tick(ts) {
  rafId = requestAnimationFrame(tick);

  if (!isPlaying) {
    lastTs = ts;
    return;
  }
  if (!lastTs) lastTs = ts;

  const dt = (ts - lastTs) / 1000;
  lastTs = ts;

  if (settings.mode === 'smooth') {
    const next = viewer.scrollTop + settings.speedPx * dt;
    viewer.scrollTop = next;
  } else {
    stepAccum += dt;
    const every = Math.max(0.05, Number(settings.stepEvery) || 1.0);
    while (stepAccum >= every) {
      stepAccum -= every;
      viewer.scrollTop = viewer.scrollTop + stepAmountPx();
    }
  }

  // stop cleanly at bottom
  if (viewer.scrollTop >= maxScrollTop() - 1) {
    viewer.scrollTop = maxScrollTop();
    setPlaying(false);
  }

  updateProgress();
}

function setPlaying(on) {
  isPlaying = !!on;
  playPauseBtn.textContent = isPlaying ? '⏸' : '▶︎';
  playPauseBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');

  if (isPlaying) {
    // reset timers so scroll is smooth after pausing
    lastTs = null;
    stepAccum = 0;
    requestWakeLockIfNeeded();
  } else {
    releaseWakeLock();
  }
}

function togglePlayPause() {
  setPlaying(!isPlaying);
  if (navigator.vibrate) navigator.vibrate(12);
}

/* ---------------- wake lock ---------------- */

async function requestWakeLockIfNeeded() {
  if (!settings.keepAwake) return;
  if (!('wakeLock' in navigator)) return;

  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch {
    // ignore (user gesture required, or unsupported)
  }
}

function releaseWakeLock() {
  try { wakeLock?.release?.(); } catch {}
  wakeLock = null;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && isPlaying) {
    requestWakeLockIfNeeded();
  } else {
    // browser usually releases it anyway, but be explicit
    releaseWakeLock();
  }
});

/* ---------------- progress ---------------- */

function updateProgress() {
  const max = maxScrollTop();
  const pct = max <= 0 ? 0 : clamp((viewer.scrollTop / max) * 100, 0, 100);
  progressFill.style.width = pct.toFixed(1) + '%';
  progressText.textContent = Math.round(pct) + '%';
}

/* ---------------- UX helpers ---------------- */

function openDialog(dlg) {
  if (typeof dlg.showModal === 'function') dlg.showModal();
  else dlg.setAttribute('open', '');
}

function isDialogOpen(dlg) {
  return dlg.hasAttribute('open');
}

function closeDialog(dlg) {
  if (typeof dlg.close === 'function') dlg.close();
  else dlg.removeAttribute('open');
}

/* Swipe nav */
let swipeStart = null;
viewer.addEventListener('pointerdown', (e) => {
  if (!settings.swipeNav) return;
  // ignore if user starts on a link/selection
  swipeStart = { x: e.clientX, y: e.clientY, t: performance.now() };
}, { passive: true });

viewer.addEventListener('pointerup', (e) => {
  if (!settings.swipeNav || !swipeStart) return;
  const dx = e.clientX - swipeStart.x;
  const dy = e.clientY - swipeStart.y;
  const dt = performance.now() - swipeStart.t;
  swipeStart = null;

  if (dt > 650) return;                  // too slow
  if (Math.abs(dx) < 90) return;         // not far enough
  if (Math.abs(dx) < Math.abs(dy) * 1.2) return; // likely a scroll gesture

  if (dx < 0) nextSong();
  else prevSong();
}, { passive: true });

/* Tap to toggle */
viewer.addEventListener('click', (e) => {
  if (!settings.tapToggles) return;
  // don't steal taps inside dialogs or inputs
  if (e.target && (e.target.closest('a, button, input, select, textarea'))) return;
  togglePlayPause();
});

/* Keep internal state aligned with manual scrolling */
viewer.addEventListener('scroll', () => {
  updateProgress();
}, { passive: true });

/* keyboard shortcuts (handy on desktop) */
document.addEventListener('keydown', (e) => {
  if (e.key === ' ' && !isDialogOpen(songsDialog) && !isDialogOpen(settingsDialog)) {
    e.preventDefault();
    togglePlayPause();
  }
  if (e.key === 'ArrowRight' && !isDialogOpen(songsDialog) && !isDialogOpen(settingsDialog)) nextSong();
  if (e.key === 'ArrowLeft' && !isDialogOpen(songsDialog) && !isDialogOpen(settingsDialog)) prevSong();
});

/* ---------------- navigation ---------------- */

function prevSong() {
  if (idx > 0) loadSong(idx - 1);
}
function nextSong() {
  if (idx < songs.length - 1) loadSong(idx + 1);
}

/* ---------------- settings handlers ---------------- */

function setSpeed(v) {
  settings.speedPx = clamp(Number(v) || 20, 5, 40);
  speedLabelEl.textContent = String(settings.speedPx);
  speedRangeEl.value = String(clamp(settings.speedPx, 5, 40));
  saveSettings();
}

function applyChordsVisibility() {
  // If chords are off, we keep the text but remove special styling
  document.documentElement.classList.toggle('no-chords', !settings.showChords);
  // Re-render so the chord spans are either styled or normal text
  loadSong(idx, { keepScroll: true });
}

scrollModeEl.addEventListener('change', () => {
  settings.mode = scrollModeEl.value === 'step' ? 'step' : 'smooth';
  saveSettings();
});

speedRangeEl.addEventListener('input', () => setSpeed(speedRangeEl.value));
stepEveryEl.addEventListener('change', () => {
  settings.stepEvery = clamp(Number(stepEveryEl.value) || 1.0, 0.05, 30);
  stepEveryEl.value = String(settings.stepEvery);
  saveSettings();
});
stepSizeEl.addEventListener('change', () => {
  settings.stepSize = stepSizeEl.value;
  saveSettings();
});

fontSizeEl.addEventListener('input', () => {
  settings.fontSize = clamp(Number(fontSizeEl.value) || 20, 14, 60);
  document.documentElement.style.setProperty('--font-size', settings.fontSize + 'px');
  saveSettings();
  // Keep song layout stable enough; don't fully re-render unless needed
});

lineHeightEl.addEventListener('input', () => {
  settings.lineHeight = clamp(Number(lineHeightEl.value) || 1.6, 1.2, 2.2);
  document.documentElement.style.setProperty('--line-height', String(settings.lineHeight));
  saveSettings();
});

keepAwakeEl.addEventListener('change', () => {
  settings.keepAwake = keepAwakeEl.checked;
  saveSettings();
  if (isPlaying) requestWakeLockIfNeeded();
  else releaseWakeLock();
});

tapTogglesEl.addEventListener('change', () => {
  settings.tapToggles = tapTogglesEl.checked;
  saveSettings();
});

swipeNavEl.addEventListener('change', () => {
  settings.swipeNav = swipeNavEl.checked;
  saveSettings();
});

showChordsEl.addEventListener('change', () => {
  settings.showChords = showChordsEl.checked;
  saveSettings();
  applyChordsVisibility();
});

/* ---------------- buttons ---------------- */

openSongsBtn.addEventListener('click', () => {
  renderSongList(songSearchEl.value);
  openDialog(songsDialog);
  // focus search for faster use
  setTimeout(() => songSearchEl.focus(), 50);
});

openSettingsBtn.addEventListener('click', () => openDialog(settingsDialog));

songSearchEl.addEventListener('input', () => renderSongList(songSearchEl.value));

prevBtn.addEventListener('click', prevSong);
nextBtn.addEventListener('click', nextSong);

playPauseBtn.addEventListener('click', togglePlayPause);

speedDownBtn.addEventListener('click', () => setSpeed(settings.speedPx - 10));
speedUpBtn.addEventListener('click', () => setSpeed(settings.speedPx + 10));
openSpeedBtn.addEventListener('click', () => openDialog(settingsDialog)); // speed chip opens settings

toTopBtn.addEventListener('click', () => {
  viewer.scrollTop = 0;
  updateProgress();
});

fullscreenBtn.addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  } catch {}
});

/* ---------------- service worker (PWA) ---------------- */

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js', { scope: './' });
  } catch {}
}

/* ---------------- init ---------------- */

applySettingsToUI();

fetch('songs.txt')
  .then(r => r.text())
  .then(txt => {
    songs = parseSongsTxt(txt);
    renderSongList();
    idx = clamp(Number(settings.idx) || 0, 0, songs.length - 1);
    loadSong(idx);
  })
  .catch(() => {
    songs = [];
    loadSong(0);
  });

if (!rafId) rafId = requestAnimationFrame(tick);

registerServiceWorker();

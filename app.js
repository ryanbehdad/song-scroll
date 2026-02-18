// Song Scroll - mobile-first autoscroll viewer for chord sheets (GitHub Pages)
// Data source: songs.txt (same format as your original project)

const viewer = document.getElementById("viewer");
const subtitle = document.getElementById("subtitle");

const sheetSongs = document.getElementById("sheetSongs");
const sheetSettings = document.getElementById("sheetSettings");

const btnSongs = document.getElementById("btnSongs");
const btnSettings = document.getElementById("btnSettings");
const btnWake = document.getElementById("btnWake");

const btnPrev = document.getElementById("btnPrev");
const btnPlay = document.getElementById("btnPlay");
const btnNext = document.getElementById("btnNext");
const btnTop = document.getElementById("btnTop");

const speedVal = document.getElementById("speedVal");
const speedVal2 = document.getElementById("speedVal2");
const btnSlower = document.getElementById("btnSlower");
const btnFaster = document.getElementById("btnFaster");

const progress = document.getElementById("progress");

const modeSmoothBtn = document.getElementById("modeSmooth");

const songSearch = document.getElementById("songSearch");
const songList = document.getElementById("songList");

const speed = document.getElementById("speed");

const font = document.getElementById("font");
const fontVal = document.getElementById("fontVal");
const lineHeight = document.getElementById("lineHeight");
const lhVal = document.getElementById("lhVal");

const tapToggle = document.getElementById("tapToggle");
const fitMinutes = document.getElementById("fitMinutes");
const btnFit = document.getElementById("btnFit");

const toast = document.getElementById("toast");

const LS_KEY = "songscroll_prefs_v2";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

let songs = [];
let idx = 0;

// --- Preferences ---
let prefs = {
  mode: "smooth",         // "smooth" | "step"
  speed: 15,              // px/s (1..40)  <-- requested
  stepSize: "line",       // line | two | half | page
  stepEvery: 2.0,         // seconds
  fontPx: 20,
  lineHeight: 1.55,
  wakeEnabled: false,
  tapToToggle: true
};

function loadPrefs(){
  try{
    const p = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    if (p && typeof p === "object") prefs = {...prefs, ...p};
  }catch{}
  // enforce requested constraints
  prefs.speed = clamp(Number(prefs.speed) || 15, 1, 40);
  prefs.stepEvery = clamp(Number(prefs.stepEvery) || 2.0, 0.2, 30);
  prefs.fontPx = clamp(Number(prefs.fontPx) || 20, 14, 34);
  prefs.lineHeight = clamp(Number(prefs.lineHeight) || 1.55, 1.2, 2.0);
}
function savePrefs(){
  localStorage.setItem(LS_KEY, JSON.stringify(prefs));
}

// --- Toast ---
let toastTimer = null;
function showToast(msg){
  toast.textContent = msg;
  toast.classList.remove("hidden");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 1500);
}

// --- Sheet controls ---
function openSheet(el, open){
  el.classList.toggle("hidden", !open);
}
btnSongs.addEventListener("click", () => openSheet(sheetSongs, true));
btnSettings.addEventListener("click", () => openSheet(sheetSettings, true));

document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.getAttribute("data-close");
    const el = document.getElementById(id);
    if (el) openSheet(el, false);
  });
});

[sheetSongs, sheetSettings].forEach(el => {
  el.addEventListener("click", (e) => {
    if (e.target === el) openSheet(el, false);
  });
});

// --- Chord rendering ---
const CHORD_IN_BRACKETS = /\[([^\]]+)\]/g;

function escapeHtml(s){
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderSong(song){
  const titleLine = `<div class="song-titleline">${escapeHtml(song.title)}${song.artist ? " — " + escapeHtml(song.artist) : ""}</div>`;
  const lines = (song.content || "").split(/\n/);

  // Keep the user's layout exactly. Highlight [CHORD] tokens.
  const out = lines.map(line => {
    const chords = [];
    const placeholder = line.replace(CHORD_IN_BRACKETS, (_m, g) => {
      const id = chords.length;
      chords.push(g);
      return `@@CHORD${id}@@`;
    });

    let escaped = escapeHtml(placeholder);
    escaped = escaped.replace(/@@CHORD(\d+)@@/g, (_m, n) => {
      const c = chords[Number(n)] || "";
      return `<span class="chord">${escapeHtml(c)}</span>`;
    });

    // Preserve spacing: use <pre> but wrap each line to allow chord highlighting
    return escaped;
  }).join("\n");

  viewer.innerHTML = titleLine + `<pre class="songtext mono">${out}</pre>`;
}

// --- Parse songs.txt (same idea as your original) ---
function parseSongsTxt(txt){
  const parts = txt
    .split(/\r?\n-{10,}\r?\n/)
    .map(p => p.replace(/\uFEFF/g, "").trim())
    .filter(Boolean);

  return parts.map(p => {
    const lines = p.split(/\r?\n/).map(l => l.trimEnd());
    let i = 0;
    while (i < lines.length && lines[i].trim() === "") i++;
    const title = lines[i] ? lines[i].trim() : "Untitled";
    let artist = "";
    let contentStart = i + 1;

    // Heuristic: second short line without chord markup is artist
    const maybeArtist = lines[contentStart] || "";
    if (
      maybeArtist &&
      !/[\[\]|]/.test(maybeArtist) &&
      maybeArtist.length < 60 &&
      maybeArtist.split(" ").length < 7
    ){
      artist = maybeArtist.trim();
      contentStart++;
    }

    const content = lines.slice(contentStart).join("\n").trim();
    return { title, artist, content };
  });
}

async function loadSongs(){
  // Network-first for songs.txt so updates show quickly (works with service worker too).
  const res = await fetch("songs.txt", { cache: "no-store" });
  const txt = await res.text();
  songs = parseSongsTxt(txt);
}

// --- Playback (smooth + step) ---
let playing = false;

// smooth loop
let rafId = null;
let lastTs = null;

// step mode interval
// step mode removed; no step timer

// If the browser quantises scrollTop to integer pixels, very low speeds can look like they 'stop'.
// We keep a fractional carry so low speeds still advance reliably.
let smoothCarry = 0;

function setMode(mode){
  // Force smooth-only mode
  prefs.mode = "smooth";
  savePrefs();
  modeSmoothBtn.classList.add("active");
  // Stop current playback when switching modes
  stop();
}

modeSmoothBtn.addEventListener("click", () => setMode("smooth"));

function scrollableMax(){
  return Math.max(0, viewer.scrollHeight - viewer.clientHeight);
}
function atBottom(){
  return viewer.scrollTop >= scrollableMax() - 1;
}

function updateProgressFromScroll(){
  const max = scrollableMax();
  const val = max <= 0 ? 0 : Math.round((viewer.scrollTop / max) * 1000);
  progress.value = String(clamp(val, 0, 1000));
}
function updateScrollFromProgress(){
  const max = scrollableMax();
  const v = Number(progress.value) || 0;
  viewer.scrollTop = (v / 1000) * max;
}

progress.addEventListener("input", () => {
  updateScrollFromProgress();
});

viewer.addEventListener("scroll", () => {
  smoothCarry = 0;
  updateProgressFromScroll();
});

function applySpeedToUI(){
  const s = clamp(Number(prefs.speed) || 15, 1, 40);
  prefs.speed = s;
  speed.value = String(s);
  speedVal.textContent = String(s);
  speedVal2.textContent = String(s);
}
function setSpeedValue(v){
  const s = clamp(Number(v) || 15, 1, 40);
  prefs.speed = s;
  savePrefs();
  applySpeedToUI();
}

speed.addEventListener("input", () => setSpeedValue(speed.value));

btnSlower.addEventListener("click", () => {
  setSpeedValue(prefs.speed - 1);  // requested increment 1
  showToast(`Speed: ${prefs.speed}`);
});
btnFaster.addEventListener("click", () => {
  setSpeedValue(prefs.speed + 1);  // requested increment 1
  showToast(`Speed: ${prefs.speed}`);
});

function playIcon(){
  btnPlay.textContent = playing ? "⏸" : "▶";
}

function stopTimers(){
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  lastTs = null;
  smoothCarry = 0;
}

function start(){
  if (!songs.length) return;
  if (playing) return;

  playing = true;
  playIcon();

  if (wakeReleaseTimer) { clearTimeout(wakeReleaseTimer); wakeReleaseTimer = null; }
  if (prefs.wakeEnabled) acquireWakeLock();

  // Sync internal scroll state with current scrollTop
  // Smooth-only playback
  lastTs = null;
  smoothCarry = 0;
  rafId = requestAnimationFrame(tickSmooth);
}

function stop(){
  playing = false;
  playIcon();
  stopTimers();
  if (prefs.wakeEnabled) scheduleWakeRelease();
  else releaseWakeLock();
}

function toggle(){
  playing ? stop() : start();
}

btnPlay.addEventListener("click", toggle);
btnTop.addEventListener("click", () => { viewer.scrollTop = 0; updateProgressFromScroll(); });

btnPrev.addEventListener("click", () => prevSong());
btnNext.addEventListener("click", () => nextSong());

function tickSmooth(ts){
  if (!playing || prefs.mode !== "smooth") return;

  if (!lastTs) lastTs = ts;
  // clamp dt to avoid huge jumps if the tab is suspended
  const dt = clamp((ts - lastTs) / 1000, 0, 0.05);
  lastTs = ts;

  const before = viewer.scrollTop;
  const delta = prefs.speed * dt;

  // Try fractional scrolling first (smoothest in modern browsers).
  viewer.scrollTop = before + delta;

  // Fallback: if scrollTop didn't change (common when quantised) and delta is sub-pixel,
  // accumulate until we can advance by >= 1px.
  const after = viewer.scrollTop;
  if (after === before && delta > 0 && delta < 1){
    smoothCarry += delta;
    const step = Math.floor(smoothCarry);
    if (step >= 1){
      viewer.scrollTop = before + step;
      smoothCarry -= step;
    }
  } else {
    smoothCarry = 0;
  }

  updateProgressFromScroll();

  if (atBottom()){
    stop();
    return;
  }
  rafId = requestAnimationFrame(tickSmooth);
}

function linePx(){
  const lh = parseFloat(getComputedStyle(viewer).lineHeight) || 24;
  return lh;
}
// step mode removed: no stepAmount/startStep or related listeners

// Tap viewer toggles play/pause (optional)
viewer.addEventListener("click", () => {
  if (!prefs.tapToToggle) return;
  // avoid accidental toggles while dragging progress
  toggle();
});

tapToggle.addEventListener("change", () => {
  prefs.tapToToggle = !!tapToggle.checked;
  savePrefs();
});

// Fit speed to minutes (smooth mode)
btnFit.addEventListener("click", () => {
  const mins = clamp(Number(fitMinutes.value) || 4, 1, 60);
  // compute required speed, then clamp to 1..40
  const max = scrollableMax();
  const needed = max / (mins * 60);
  const s = clamp(needed, 1, 40);
  setSpeedValue(s);
  setMode("smooth");
  showToast(`Speed set to ${prefs.speed}`);
});

// Font / line-height
function applyTypography(){
  viewer.style.fontSize = `${prefs.fontPx}px`;
  viewer.style.lineHeight = String(prefs.lineHeight);
  font.value = String(prefs.fontPx);
  fontVal.textContent = `${prefs.fontPx} px`;
  lineHeight.value = String(prefs.lineHeight);
  lhVal.textContent = String(prefs.lineHeight);
}
font.addEventListener("input", () => {
  prefs.fontPx = clamp(Number(font.value) || 20, 14, 34);
  savePrefs();
  applyTypography();
});
lineHeight.addEventListener("input", () => {
  prefs.lineHeight = clamp(Number(lineHeight.value) || 1.55, 1.2, 2.0);
  savePrefs();
  applyTypography();
});

// --- Wake Lock ---
let wakeLock = null;

let wakeReleaseTimer = null;
const WAKE_GRACE_MS = 3 * 60 * 1000; // keep screen on for a few minutes after stopping

function scheduleWakeRelease(){
  if (wakeReleaseTimer) clearTimeout(wakeReleaseTimer);
  wakeReleaseTimer = setTimeout(() => {
    wakeReleaseTimer = null;
    // Only release if we're still not playing
    if (!playing) releaseWakeLock();
  }, WAKE_GRACE_MS);
}

async function acquireWakeLock(){
  try{
    if (!("wakeLock" in navigator)) throw new Error("Wake Lock unsupported");
    wakeLock = await navigator.wakeLock.request("screen");
  }catch(e){
    wakeLock = null;
  }
  renderWakeUI();
}
async function releaseWakeLock(){
  try{
    if (wakeLock) await wakeLock.release();
  }catch{}
  wakeLock = null;
  renderWakeUI();
}
function renderWakeUI(){
  btnWake.textContent = prefs.wakeEnabled ? "Awake: On" : "Awake: Off";
  if (prefs.wakeEnabled && !wakeLock && playing) {
    // If lock was released (focus change), try again
    btnWake.textContent = "Awake: …";
  }
}
btnWake.addEventListener("click", async () => {
  prefs.wakeEnabled = !prefs.wakeEnabled;
  savePrefs();
  if (prefs.wakeEnabled && playing) await acquireWakeLock();
  if (wakeReleaseTimer) { clearTimeout(wakeReleaseTimer); wakeReleaseTimer = null; }
  await releaseWakeLock();
  renderWakeUI();
});
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible" && prefs.wakeEnabled && playing) {
    await acquireWakeLock();
  }
});

// --- Song selection ---
function setSubtitle(){
  if (!songs.length) {
    subtitle.textContent = "No songs found";
    return;
  }
  const s = songs[idx];
  subtitle.textContent = s ? (s.title + (s.artist ? " — " + s.artist : "")) : "Select a song";
}

function loadSong(i){
  idx = clamp(i, 0, songs.length - 1);
  stop();
  renderSong(songs[idx]);
  viewer.scrollTop = 0;
  updateProgressFromScroll();
  setSubtitle();
}

function prevSong(){
  if (!songs.length) return;
  loadSong((idx - 1 + songs.length) % songs.length);
}
function nextSong(){
  if (!songs.length) return;
  loadSong((idx + 1) % songs.length);
}

function renderSongList(filter=""){
  const q = (filter || "").trim().toLowerCase();
  songList.innerHTML = "";
  songs.forEach((s, i) => {
    const hay = (s.title + " " + (s.artist || "")).toLowerCase();
    if (q && !hay.includes(q)) return;

    const item = document.createElement("button");
    item.type = "button";
    item.className = "songitem";
    item.role = "listitem";
    item.innerHTML = `<div class="t">${escapeHtml(s.title)}</div>${s.artist ? `<div class="a">${escapeHtml(s.artist)}</div>` : ""}`;
    item.addEventListener("click", () => {
      loadSong(i);
      openSheet(sheetSongs, false);
    });
    songList.appendChild(item);
  });
}

songSearch.addEventListener("input", () => renderSongList(songSearch.value));

// --- Keyboard (and pedal) shortcuts ---
document.addEventListener("keydown", (e) => {
  if (!sheetSongs.classList.contains("hidden") || !sheetSettings.classList.contains("hidden")) return;

  if (e.code === "Space") { e.preventDefault(); toggle(); }
  if (e.code === "Home") { e.preventDefault(); viewer.scrollTop = 0; }

  // Speed in smooth mode
  if (prefs.mode === "smooth") {
    if (e.code === "ArrowUp") { e.preventDefault(); setSpeedValue(prefs.speed + 1); }
    if (e.code === "ArrowDown") { e.preventDefault(); setSpeedValue(prefs.speed - 1); }
  }

  if (e.code === "ArrowRight") { e.preventDefault(); nextSong(); }
  if (e.code === "ArrowLeft") { e.preventDefault(); prevSong(); }

  if (e.code === "PageDown") { e.preventDefault(); viewer.scrollTop += Math.floor(viewer.clientHeight * 0.9); }
  if (e.code === "PageUp") { e.preventDefault(); viewer.scrollTop -= Math.floor(viewer.clientHeight * 0.9); }
});

// --- Swipe gestures (left/right to change songs) ---
let touchStartX = null;
let touchStartY = null;
viewer.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}, { passive: true });

viewer.addEventListener("touchend", (e) => {
  if (touchStartX == null || touchStartY == null) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  touchStartX = null;
  touchStartY = null;

  // Horizontal swipe only if mostly horizontal
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    if (dx < 0) nextSong();
    else prevSong();
    showToast(dx < 0 ? "Next" : "Previous");
  }
}, { passive: true });

// --- App init ---
async function init(){
  loadPrefs();

  applySpeedToUI();
  applyTypography();

  // step mode removed; no UI values to set
  tapToggle.checked = !!prefs.tapToToggle;

  renderWakeUI();
  setMode(prefs.mode);

  try{
    await loadSongs();
    renderSongList("");
    if (songs.length) loadSong(0);
    else {
      subtitle.textContent = "songs.txt is empty";
      viewer.innerHTML = '<div class="muted">No songs found. Add songs to songs.txt in your repo.</div>';
    }
  }catch(err){
    console.error(err);
    subtitle.textContent = "Failed to load songs";
    viewer.innerHTML = '<div class="muted">Failed to load songs.txt. Check it exists in the repo root.</div>';
  }

  // Service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }
}
init();

const $ = (sel) => document.querySelector(sel);

/* =========================
   DOM
========================= */
const viewer = $('#viewer');
const songTitleEl = $('#songTitle');
const songArtistEl = $('#songArtist');
const listEl = $('#songList');
const playBtn = $('#playBtn');
const speedInput = $('#speed');
const speedVal = $('#speedVal');

/* =========================
   STATE
========================= */
let songs = [];
let currentIndex = 0;

let isPlaying = false;
let rafId = null;
let lastTs = null;
let stepAccum = 0;

// 🔑 FIX: floating-point accumulator for smooth scrolling
let smoothPos = 0;

/* =========================
   SETTINGS
========================= */
const settings = {
  mode: 'smooth',          // smooth | step
  speedPx: 15,             // px/sec
  stepEvery: 2.0           // seconds
};

/* =========================
   LOAD SONGS
========================= */
async function loadSongs() {
  const res = await fetch('songs.txt');
  const text = await res.text();

  const blocks = text.split(/\n-{3,}\n/);
  songs = blocks.map(block => {
    const lines = block.trim().split('\n');
    if (!lines.length) return null;

    const title = lines[0] || '';
    let artist = '';
    let bodyStart = 1;

    if (lines[1] && !lines[1].startsWith('[')) {
      artist = lines[1];
      bodyStart = 2;
    }

    return {
      title,
      artist,
      body: lines.slice(bodyStart).join('\n')
    };
  }).filter(Boolean);

  renderSongList();
  loadSong(0);
}

/* =========================
   RENDER
========================= */
function songToHtml(song) {
  return song.body
    .replace(/\[([^\]]+)\]/g, '<span class="chord">[$1]</span>')
    .split('\n')
    .map(l => `<div class="line">${l || '&nbsp;'}</div>`)
    .join('');
}

function loadSong(index, keepScroll = false) {
  currentIndex = Math.max(0, Math.min(index, songs.length - 1));
  const s = songs[currentIndex];

  const oldScroll = viewer.scrollTop;

  songTitleEl.textContent = s.title;
  songArtistEl.textContent = s.artist || '';
  viewer.innerHTML = songToHtml(s);

  viewer.scrollTop = keepScroll ? oldScroll : 0;
  smoothPos = viewer.scrollTop;

  highlightActiveSong();
}

function renderSongList() {
  listEl.innerHTML = '';
  songs.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.className = 'song-item';
    btn.textContent = s.title;
    btn.onclick = () => {
      setPlaying(false);
      loadSong(i);
    };
    listEl.appendChild(btn);
  });
}

function highlightActiveSong() {
  [...listEl.children].forEach((el, i) => {
    el.classList.toggle('active', i === currentIndex);
  });
}

/* =========================
   SCROLL LOGIC
========================= */
function maxScrollTop() {
  return Math.max(0, viewer.scrollHeight - viewer.clientHeight);
}

function tick(ts) {
  if (!isPlaying) return;

  if (!lastTs) lastTs = ts;
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;

  if (settings.mode === 'smooth') {
    // ✅ FIXED: accumulate fractional pixels
    smoothPos += settings.speedPx * dt;
    viewer.scrollTop = smoothPos;
  } else {
    stepAccum += dt;
    if (stepAccum >= settings.stepEvery) {
      stepAccum = 0;
      viewer.scrollTop += viewer.clientHeight * 0.9;
      smoothPos = viewer.scrollTop;
    }
  }

  if (viewer.scrollTop >= maxScrollTop() - 1) {
    viewer.scrollTop = maxScrollTop();
    smoothPos = viewer.scrollTop;
    setPlaying(false);
    return;
  }

  rafId = requestAnimationFrame(tick);
}

/* =========================
   PLAY / PAUSE
========================= */
function setPlaying(on) {
  isPlaying = on;
  playBtn.textContent = on ? 'Pause' : 'Play';

  if (on) {
    lastTs = null;
    stepAccum = 0;
    smoothPos = viewer.scrollTop;
    rafId = requestAnimationFrame(tick);
  } else {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

/* =========================
   EVENTS
========================= */
playBtn.onclick = () => setPlaying(!isPlaying);

speedInput.oninput = () => {
  settings.speedPx = Number(speedInput.value);
  speedVal.textContent = settings.speedPx;
};

// 🔄 Keep accumulator in sync if user scrolls manually
viewer.addEventListener('scroll', () => {
  if (!isPlaying) smoothPos = viewer.scrollTop;
});

/* =========================
   INIT
========================= */
loadSongs();

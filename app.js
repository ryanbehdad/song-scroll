const viewer = document.getElementById('viewer')
const songListEl = document.getElementById('songList')

const openSongsBtn = document.getElementById('openSongs')
const closeSongsBtn = document.getElementById('closeSongs')
const drawerEl = document.getElementById('songDrawer')
const scrimEl = document.getElementById('scrim')

const songTitleEl = document.getElementById('songTitle')
const songMetaEl = document.getElementById('songMeta')

const speedEl = document.getElementById('speed')
const speedVal = document.getElementById('speedVal')
const fontEl = document.getElementById('font')
const fontVal = document.getElementById('fontVal')
const playPauseBtn = document.getElementById('playPause')
const prevBtn = document.getElementById('prev')
const nextBtn = document.getElementById('next')
const topBtn = document.getElementById('top')
const autoToggle = document.getElementById('autoscrollToggle')

const STORAGE = {
  scrollSpeed: 'scrollSpeed',
  fontSize: 'fontSize',
}

const DESKTOP_MQ = window.matchMedia('(min-width: 980px)')

let songs = []
let idx = 0

let isPlaying = false
let scrollStartTs = 0
let scrollStartTop = 0

let speed = safeNumber(localStorage.getItem(STORAGE.scrollSpeed), 60)
let fontSize = safeNumber(localStorage.getItem(STORAGE.fontSize), 20)

speed = clamp(speed, 5, 400)
fontSize = clamp(fontSize, 14, 44)

speedEl.value = String(speed)
speedVal.textContent = String(speed)
fontEl.value = String(fontSize)
fontVal.textContent = String(fontSize)
viewer.style.fontSize = fontSize + 'px'

syncDrawerToViewport()
DESKTOP_MQ.addEventListener('change', () => syncDrawerToViewport())

// Load bundled songs.txt
fetch('songs.txt', { cache: 'no-cache' })
  .then((r) => {
    if (!r.ok) throw new Error('HTTP ' + r.status)
    return r.text()
  })
  .then((txt) => {
    songs = parseSongsTxt(txt)
    renderSongList()
    if (songs.length) loadSong(0)
  })
  .catch((err) => {
    console.error('Failed to load songs.txt', err)
    songListEl.innerHTML = ''
    const el = document.createElement('div')
    el.className = 'song-item'
    el.textContent = '(failed to load songs)'
    songListEl.appendChild(el)
  })

function parseSongsTxt(txt) {
  const cleaned = String(txt || '').replace(/\uFEFF/g, '')
  const parts = cleaned
    .split(/\r?\n-{10,}\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  return parts.map((p) => {
    const lines = p.split(/\r?\n/).map((l) => l.trimEnd())
    let lineIdx = 0
    while (lineIdx < lines.length && lines[lineIdx].trim() === '') lineIdx++
    const title = (lines[lineIdx] || 'Untitled').trim()
    let artist = ''
    let contentStart = lineIdx + 1
    if (looksLikeArtistLine(lines[contentStart])) {
      artist = (lines[contentStart] || '').trim()
      contentStart++
    }
    const content = lines.slice(contentStart).join('\n').trim()
    return { title, artist, content }
  })
}

function looksLikeArtistLine(line) {
  if (!line) return false
  const s = line.trim()
  if (!s) return false
  if (s.length > 60) return false
  if (s.split(/\s+/).length > 6) return false
  if (/\[|\]|\|/.test(s)) return false
  return true
}

function renderSongList() {
  songListEl.innerHTML = ''
  songs.forEach((s, i) => {
    const el = document.createElement('div')
    el.className = 'song-item'
    if (i === idx) el.classList.add('active')
    el.textContent = s.title + (s.artist ? ' — ' + s.artist : '')
    el.addEventListener('click', () => {
      loadSong(i)
      if (!DESKTOP_MQ.matches) closeDrawer()
    })
    songListEl.appendChild(el)
  })
}

function loadSong(i) {
  idx = clamp(i, 0, Math.max(0, songs.length - 1))
  const s = songs[idx]
  if (!s) return

  updateHeader(s)

  viewer.innerHTML = ''
  viewer.appendChild(renderSongContent(s))
  viewer.scrollTop = 0
  resetScrollBaseline()

  updateActiveSongItem()
}

function updateHeader(song) {
  songTitleEl.textContent = song.title || 'Untitled'
  songMetaEl.textContent = song.artist || ''
}

function updateActiveSongItem() {
  const items = songListEl.querySelectorAll('.song-item')
  items.forEach((el, i) => el.classList.toggle('active', i === idx))
}

function renderSongContent(song) {
  const root = document.createElement('div')

  const titleLine = document.createElement('div')
  titleLine.className = 'line'
  titleLine.style.fontWeight = '700'
  titleLine.style.fontSize = (fontSize + 6) + 'px'
  titleLine.textContent = song.title + (song.artist ? ' — ' + song.artist : '')
  root.appendChild(titleLine)

  const content = String(song.content || '')
  const lines = content.split(/\n/)
  for (const lineText of lines) {
    const lineEl = document.createElement('div')
    lineEl.className = 'line'
    appendChordifiedLine(lineEl, lineText)
    root.appendChild(lineEl)
  }

  return root
}

function appendChordifiedLine(container, lineText) {
  const text = String(lineText || '')
  let lastIndex = 0
  const chordRegex = /\[([^\]]+)\]/g
  let match
  while ((match = chordRegex.exec(text))) {
    const before = text.slice(lastIndex, match.index)
    if (before) container.appendChild(document.createTextNode(before))

    const chord = String(match[1] || '').trim()
    if (chord) {
      const chordEl = document.createElement('span')
      chordEl.className = 'chord'
      chordEl.textContent = chord
      container.appendChild(chordEl)
    }

    lastIndex = match.index + match[0].length
  }
  const rest = text.slice(lastIndex)
  if (rest) container.appendChild(document.createTextNode(rest))
}

function setPlaying(playing) {
  isPlaying = Boolean(playing)
  playPauseBtn.textContent = isPlaying ? 'Pause' : 'Play'
  if (isPlaying) resetScrollBaseline()
}

function resetScrollBaseline() {
  scrollStartTs = performance.now()
  scrollStartTop = viewer.scrollTop
}

function maxScrollTop() {
  return Math.max(0, viewer.scrollHeight - viewer.clientHeight)
}

function tick(ts) {
  requestAnimationFrame(tick)
  if (!autoToggle.checked || !isPlaying) return

  const maxTop = maxScrollTop()
  if (maxTop <= 0) return

  const elapsed = (ts - scrollStartTs) / 1000
  const nextTop = scrollStartTop + speed * elapsed
  viewer.scrollTop = Math.min(maxTop, Math.floor(nextTop))

  if (viewer.scrollTop >= maxTop) setPlaying(false)
}
requestAnimationFrame(tick)

// If the user scrolls while playing, keep the baseline in sync
let userScrollDebounce = 0
viewer.addEventListener(
  'scroll',
  () => {
    if (!isPlaying) return
    clearTimeout(userScrollDebounce)
    userScrollDebounce = setTimeout(() => {
      resetScrollBaseline()
    }, 120)
  },
  { passive: true }
)

playPauseBtn.addEventListener('click', () => setPlaying(!isPlaying))
prevBtn.addEventListener('click', () => {
  if (idx > 0) loadSong(idx - 1)
})
nextBtn.addEventListener('click', () => {
  if (idx < songs.length - 1) loadSong(idx + 1)
})
topBtn.addEventListener('click', () => {
  viewer.scrollTop = 0
  resetScrollBaseline()
})

speedEl.addEventListener('input', () => {
  speed = clamp(Number(speedEl.value), 5, 400)
  speedVal.textContent = String(speed)
  localStorage.setItem(STORAGE.scrollSpeed, String(speed))
  resetScrollBaseline()
})

fontEl.addEventListener('input', () => {
  fontSize = clamp(Number(fontEl.value), 14, 44)
  fontVal.textContent = String(fontSize)
  viewer.style.fontSize = fontSize + 'px'
  localStorage.setItem(STORAGE.fontSize, String(fontSize))
  const current = songs[idx]
  if (current) updateHeader(current)
  // re-render to apply title size changes
  if (current) {
    const top = viewer.scrollTop
    viewer.innerHTML = ''
    viewer.appendChild(renderSongContent(current))
    viewer.scrollTop = Math.min(top, maxScrollTop())
    resetScrollBaseline()
  }
})

// Drawer
openSongsBtn.addEventListener('click', () => openDrawer())
closeSongsBtn.addEventListener('click', () => closeDrawer())
scrimEl.addEventListener('click', () => closeDrawer())
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDrawer()
})

function openDrawer() {
  if (DESKTOP_MQ.matches) return
  drawerEl.hidden = false
  scrimEl.hidden = false
  // focus the drawer for keyboard users
  drawerEl.setAttribute('tabindex', '-1')
  drawerEl.focus({ preventScroll: true })
}

function closeDrawer() {
  if (DESKTOP_MQ.matches) return
  drawerEl.hidden = true
  scrimEl.hidden = true
  openSongsBtn.focus({ preventScroll: true })
}

function syncDrawerToViewport() {
  if (DESKTOP_MQ.matches) {
    drawerEl.hidden = false
    scrimEl.hidden = true
  } else {
    drawerEl.hidden = true
    scrimEl.hidden = true
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return

  if (e.key === ' ') {
    e.preventDefault()
    setPlaying(!isPlaying)
  }
  if (e.key === 'ArrowRight') {
    if (idx < songs.length - 1) loadSong(idx + 1)
  }
  if (e.key === 'ArrowLeft') {
    if (idx > 0) loadSong(idx - 1)
  }
  if (e.key === 'ArrowUp') viewer.scrollTop -= 60
  if (e.key === 'ArrowDown') viewer.scrollTop += 60
})

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function safeNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const viewer = document.getElementById('viewer')
const songListEl = document.getElementById('songList')
const speedEl = document.getElementById('speed')
const speedVal = document.getElementById('speedVal')
const fontEl = document.getElementById('font')
const fontVal = document.getElementById('fontVal')
const playBtn = document.getElementById('play')
const pauseBtn = document.getElementById('pause')
const prevBtn = document.getElementById('prev')
const nextBtn = document.getElementById('next')
const topBtn = document.getElementById('top')
const autoToggle = document.getElementById('autoscrollToggle')
const toggleSidebarBtn = document.getElementById('toggleSidebar')
const speedMinusBtn = document.getElementById('speedMinus')
const speedPlusBtn = document.getElementById('speedPlus')
const speedNum = document.getElementById('speedNum')

const SIDEBAR_KEY = 'sidebarHidden'

let songs = []
let idx = 0
let running = false
let last = null
let scrollY = 0

let speed = Number(localStorage.getItem('scrollSpeed') || 15) // px per second
let fontSize = Number(localStorage.getItem('fontSize') || 20)

// clamp speed to a sensible range for this app
const SPEED_MIN = 1
const SPEED_MAX = 40
function clampSpeed(v){
  v = Number(v)
  if(!Number.isFinite(v)) v = 15
  return Math.max(SPEED_MIN, Math.min(SPEED_MAX, v))
}
speed = clampSpeed(speed)

speedEl.value = speed; speedVal.textContent = speed; if (speedNum) speedNum.value = speed
fontEl.value = fontSize; fontVal.textContent = fontSize

// load bundled songs.txt
fetch('songs.txt').then(r => r.text()).then(txt => {
  songs = parseSongsTxt(txt)
  renderSongList()
  if (songs.length) loadSong(0)
}).catch(err => {
  console.error('Failed to load songs.txt', err)
  songListEl.innerHTML = '<div class="song-item">(failed to load songs)</div>'
})

function parseSongsTxt(txt){
  const parts = txt.split(/\r?\n-{10,}\r?\n/).map(p => p.trim()).filter(Boolean)
  return parts.map(p => {
    const lines = p.split(/\r?\n/).map(l => l.replace(/\uFEFF/g,'')).map(l => l.trimEnd())
    let idxLine = 0
    while (idxLine < lines.length && lines[idxLine].trim() === '') idxLine++

    const title = lines[idxLine] || 'Untitled'
    let artist = ''
    let contentStart = idxLine + 1

    // Heuristic: treat 2nd line as artist if it isn't "chordy"
    if (
      lines[contentStart] &&
      !/\[|\||\|:|\|\s{2,}/.test(lines[contentStart]) &&
      lines[contentStart].length < 60 &&
      lines[contentStart].split(' ').length < 6
    ){
      artist = lines[contentStart]
      contentStart++
    }

    const content = lines.slice(contentStart).join('\n').trim()
    return { title: title.trim(), artist: artist.trim(), content }
  })
}

function renderSongList(){
  songListEl.innerHTML = ''
  songs.forEach((s, i) => {
    const el = document.createElement('div')
    el.className = 'song-item'
    el.textContent = s.title
    el.addEventListener('click', () => loadSong(i))
    songListEl.appendChild(el)
  })
  highlightActive()
}

function highlightActive(){
  Array.from(songListEl.children).forEach((el, i) => {
    el.classList.toggle('active', i === idx)
  })
}

function parseToHtml(txt){
  const lines = txt.split('\n')
  return lines.map(line => {
    const safe = escapeHtml(line)
    const out = safe.replace(/\[([^\]]+)\]/g, '<span class="chord">[$1]</span>')
    return `<div class="line">${out || '&nbsp;'}</div>`
  }).join('')
}

function escapeHtml(s){
  // Your original file had some extra replacements; keep it simple + safe here
  return s.replaceAll('&','&amp;')
    .replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
}

function loadSong(i){
  idx = i
  const s = songs[i]

  viewer.innerHTML = ''
  const title = document.createElement('div')
  title.className = 'line'
  title.style.fontWeight = '700'
  title.style.fontSize = (fontSize + 6) + 'px'
  title.textContent = s.title + (s.artist ? ' — ' + s.artist : '')
  viewer.appendChild(title)

  const block = document.createElement('div')
  block.innerHTML = parseToHtml(s.content)
  viewer.appendChild(block)

  viewer.scrollTop = 0
  scrollY = 0
  highlightActive()
}

// sidebar toggle logic
function setSidebarHidden(hidden){
  if (hidden) document.documentElement.classList.add('sidebar-hidden')
  else document.documentElement.classList.remove('sidebar-hidden')
  localStorage.setItem(SIDEBAR_KEY, hidden ? '1' : '0')
}
if (toggleSidebarBtn){
  toggleSidebarBtn.addEventListener('click', () => {
    const hidden = document.documentElement.classList.contains('sidebar-hidden')
    setSidebarHidden(!hidden)
  })
}
try { if (localStorage.getItem(SIDEBAR_KEY) === '1') setSidebarHidden(true) } catch(e){}

// auto-scroll loop
function step(ts){
  if (!running || !autoToggle.checked) { last = ts; requestAnimationFrame(step); return }
  if (!last) last = ts

  const dt = (ts - last) / 1000
  last = ts

  // ✅ FIX: DO NOT floor. Keep fractional accumulator so low speeds move.
  scrollY += speed * dt
  viewer.scrollTop = scrollY

  requestAnimationFrame(step)
}
requestAnimationFrame(step)

// controls
playBtn.addEventListener('click', ()=>{ running = true; last = null })
pauseBtn.addEventListener('click', ()=>{ running = false })
prevBtn.addEventListener('click', ()=>{ if (idx > 0) loadSong(idx - 1) })
nextBtn.addEventListener('click', ()=>{ if (idx < songs.length - 1) loadSong(idx + 1) })
topBtn.addEventListener('click', ()=>{ viewer.scrollTop = 0; scrollY = 0 })

// If you manually scroll (touch), keep the accumulator in sync
viewer.addEventListener('scroll', ()=>{ if (!running) scrollY = viewer.scrollTop })

// speed controls (range + numeric + +/-)
speedEl.addEventListener('input', ()=>{
  speed = clampSpeed(speedEl.value)
  speedEl.value = speed
  speedVal.textContent = speed
  if (speedNum) speedNum.value = speed
  localStorage.setItem('scrollSpeed', speed)
})
if (speedMinusBtn) speedMinusBtn.addEventListener('click', ()=>{
  speed = clampSpeed(speed - 1)
  speedEl.value = speed
  if (speedNum) speedNum.value = speed
  speedVal.textContent = speed
  localStorage.setItem('scrollSpeed', speed)
})
if (speedPlusBtn) speedPlusBtn.addEventListener('click', ()=>{
  speed = clampSpeed(speed + 1)
  speedEl.value = speed
  if (speedNum) speedNum.value = speed
  speedVal.textContent = speed
  localStorage.setItem('scrollSpeed', speed)
})
if (speedNum) speedNum.addEventListener('change', ()=>{
  speed = clampSpeed(speedNum.value)
  speedEl.value = speed
  speedVal.textContent = speed
  localStorage.setItem('scrollSpeed', speed)
})

// font
fontEl.addEventListener('input', ()=>{
  fontSize = Number(fontEl.value)
  fontVal.textContent = fontSize
  viewer.style.fontSize = fontSize + 'px'
  localStorage.setItem('fontSize', fontSize)
})

// navigation keys
document.addEventListener('keydown', (e)=>{
  if (e.key === ' ') { e.preventDefault(); running = !running }
  if (e.key === 'ArrowRight') { if (idx < songs.length - 1) loadSong(idx + 1) }
  if (e.key === 'ArrowLeft') { if (idx > 0) loadSong(idx - 1) }
  if (e.key === 'ArrowUp') viewer.scrollTop -= 50
  if (e.key === 'ArrowDown') viewer.scrollTop += 50
})

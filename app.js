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

const SIDEBAR_KEY = 'sidebarHidden'

let songs = []
let idx = 0
let running = false
let last = null
let scrollY = 0
let speed = Number(localStorage.getItem('scrollSpeed')||60) // px per second
let fontSize = Number(localStorage.getItem('fontSize')||20)

speedEl.value = speed; speedVal.textContent = speed
fontEl.value = fontSize; fontVal.textContent = fontSize

// load bundled songs.txt
fetch('songs.txt').then(r=>r.text()).then(txt=>{
  songs = parseSongsTxt(txt)
  renderSongList()
  if(songs.length) loadSong(0)
}).catch(err=>{
  console.error('Failed to load songs.txt', err)
  songListEl.innerHTML = '<div class="song-item">(failed to load songs)</div>'
})

function parseSongsTxt(txt){
  const parts = txt.split(/\r?\n-{10,}\r?\n/).map(p=>p.trim()).filter(Boolean)
  return parts.map(p=>{
    const lines = p.split(/\r?\n/).map(l=>l.replace(/\uFEFF/g,'')).map(l=>l.trimEnd())
    let idxLine = 0
    while(idxLine<lines.length && lines[idxLine].trim()==='') idxLine++
    const title = lines[idxLine]||'Untitled'
    let artist = ''
    let contentStart = idxLine+1
    if(lines[contentStart] && !/\[|\||\|:|\|\s{2,}/.test(lines[contentStart]) && lines[contentStart].length<60 && lines[contentStart].split(' ').length<6){
      artist = lines[contentStart]
      contentStart++
    }
    const content = lines.slice(contentStart).join('\n').trim()
    return { title: title.trim(), artist: artist.trim(), content }
  })
}

function renderSongList(){
  songListEl.innerHTML = ''
  songs.forEach((s,i)=>{
    const el = document.createElement('div')
    el.className = 'song-item'
    if(i===idx) el.classList.add('active')
    el.textContent = s.title + (s.artist? ' — '+s.artist : '')
    el.addEventListener('click', ()=>{ loadSong(i) })
    songListEl.appendChild(el)
  })
}

function parseToHtml(text){
  const lines = text.split(/\n/)
  return lines.map(l=>{
    const chords = []
    const placeholderLine = l.replace(/\[([^\]]+)\]/g, (m, g) => {
      const id = chords.length
      chords.push(g)
      return `@@CHORD${id}@@`
    })
    let escaped = escapeHtml(placeholderLine)
    escaped = escaped.replace(/@@CHORD(\d+)@@/g, (m, n) => {
      const c = chords[Number(n)] || ''
      return `<span class="chord">${escapeHtml(c)}</span>`
    })
    return `<div class="line">${escaped}</div>`
  }).join('')
}

function escapeHtml(s){
  return s.replaceAll('&amp;','&').replaceAll('&','&amp;')
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
  title.style.fontSize = (fontSize+6)+'px'
  title.textContent = s.title + (s.artist? ' — '+s.artist : '')
  viewer.appendChild(title)
  const block = document.createElement('div')
  block.innerHTML = parseToHtml(s.content)
  viewer.appendChild(block)
  viewer.scrollTop = 0
  scrollY = 0
}

// sidebar toggle logic
function setSidebarHidden(hidden){
  if(hidden) document.documentElement.classList.add('sidebar-hidden')
  else document.documentElement.classList.remove('sidebar-hidden')
  localStorage.setItem(SIDEBAR_KEY, hidden? '1':'0')
}
if(toggleSidebarBtn){
  toggleSidebarBtn.addEventListener('click', ()=>{
    const hidden = document.documentElement.classList.contains('sidebar-hidden')
    setSidebarHidden(!hidden)
  })
}
try{ if(localStorage.getItem(SIDEBAR_KEY) === '1') setSidebarHidden(true) }catch(e){}

// auto-scroll loop
function step(ts){
  if(!running || !autoToggle.checked) { last = ts; requestAnimationFrame(step); return }
  if(!last) last = ts
  const dt = (ts-last)/1000
  last = ts
  scrollY += speed * dt
  viewer.scrollTop = Math.floor(scrollY)
  requestAnimationFrame(step)
}
requestAnimationFrame(step)

playBtn.addEventListener('click', ()=>{ running = true; last = null })
pauseBtn.addEventListener('click', ()=>{ running = false })
prevBtn.addEventListener('click', ()=>{ if(idx>0) loadSong(idx-1) })
nextBtn.addEventListener('click', ()=>{ if(idx<songs.length-1) loadSong(idx+1) })
topBtn.addEventListener('click', ()=>{ viewer.scrollTop = 0; scrollY = 0 })

speedEl.addEventListener('input', ()=>{ speed = Number(speedEl.value); speedVal.textContent = speed; localStorage.setItem('scrollSpeed',speed) })
fontEl.addEventListener('input', ()=>{ fontSize = Number(fontEl.value); fontVal.textContent = fontSize; viewer.style.fontSize = fontSize+'px'; localStorage.setItem('fontSize',fontSize) })

// navigation keys
document.addEventListener('keydown', (e)=>{
  if(e.key === ' ') { e.preventDefault(); running = !running }
  if(e.key === 'ArrowRight') { if(idx<songs.length-1) loadSong(idx+1) }
  if(e.key === 'ArrowLeft') { if(idx>0) loadSong(idx-1) }
  if(e.key === 'ArrowUp') viewer.scrollTop -= 50
  if(e.key === 'ArrowDown') viewer.scrollTop += 50
})

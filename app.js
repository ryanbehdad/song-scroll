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

let songs = []
let idx = 0
let running = false
let last = null
let scrollY = 0
let speed = Number(localStorage.getItem('scrollSpeed')||60) // px per second
let fontSize = Number(localStorage.getItem('fontSize')||20)

speedEl.value = speed; speedVal.textContent = speed
fontEl.value = fontSize; fontVal.textContent = fontSize

// Load songs from a single text file (`songs.txt`) where songs are separated
// by a long dashed line (--------------------------------------------)
fetch('songs.txt').then(r=>r.text()).then(txt=>{
  songs = parseSongsTxt(txt)
  renderSongList()
  if(songs.length) loadSong(0)
})

function parseSongsTxt(txt){
  const parts = txt.split(/\r?\n-{10,}\r?\n/).map(p=>p.trim()).filter(Boolean)
  return parts.map(p=>{
    const lines = p.split(/\r?\n/)
      .map(l=>l.replace(/\uFEFF/g,'')) // strip BOM if any
      .map(l=>l.trimEnd())
    // first non-empty line is title
    let idxLine = 0
    while(idxLine<lines.length && lines[idxLine].trim()==='') idxLine++
    const title = lines[idxLine]||'Untitled'
    // next line may be artist if short and not a chord/notation line
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
    el.textContent = s.title + (s.artist? ' — '+s.artist : '')
    el.addEventListener('click', ()=>{ loadSong(i); })
    songListEl.appendChild(el)
  })
}

function parseToHtml(text){
  const lines = text.split(/\n/)
  return lines.map(l=>{
    // Replace chords with placeholders, escape the line, then restore chord spans
    const chords = []
    const placeholderLine = l.replace(/\[([^\]]+)\]/g, (m, g) => {
      const id = chords.length
      chords.push(g)
      return `@@CHORD${id}@@`
    })

    let escaped = escapeHtml(placeholderLine)

    // restore placeholders with safe chord spans
    escaped = escaped.replace(/@@CHORD(\\d+)@@/g, (m, n) => {
      const c = chords[Number(n)] || ''
      return `<span class="chord">${escapeHtml(c)}</span>`
    })

    return `<div class="line">${escaped}</div>`
  }).join('')
}

function escapeHtml(s){
  return s.replaceAll('&amp;','&').replaceAll('&','&amp;')
    .replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('\"','&quot;')
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

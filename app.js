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

// sidebar hide state key
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

// Editor elements
const editTitle = document.getElementById('editTitle')
const editArtist = document.getElementById('editArtist')
const editContent = document.getElementById('editContent')
const addSongBtn = document.getElementById('addSong')
const updateSongBtn = document.getElementById('updateSong')
const deleteSongBtn = document.getElementById('deleteSong')
const exportBtn = document.getElementById('exportJson')
const importFile = document.getElementById('importFile')
const clearLocalBtn = document.getElementById('clearLocal')

// Always load bundled `songs.txt` by default. If local edits exist, show a notice so the user can opt in.
const stored = localStorage.getItem('customSongs')
fetch('songs.txt').then(r=>r.text()).then(txt=>{
  songs = parseSongsTxt(txt)
  renderSongList()
  if(songs.length) loadSong(0)

  if(stored){
    try{
      // Only show notice; do NOT automatically replace the list
      const notice = document.getElementById('localNotice')
      notice.hidden = false
      const loadBtn = document.getElementById('loadLocal')
      const clear2 = document.getElementById('clearLocal2')
      loadBtn.addEventListener('click', ()=>{
        try{ const parsed = JSON.parse(stored); if(Array.isArray(parsed)){ songs = parsed; saveLocalSongs(); renderSongList(); loadSong(0); populateEditor(0); notice.hidden=true } else alert('Local data is invalid') }
        catch(e){ alert('Could not load local songs') }
      })
      clear2.addEventListener('click', ()=>{ if(confirm('Clear locally saved songs and reload originals?')){ localStorage.removeItem('customSongs'); notice.hidden=true; location.reload() } })
    }catch(e){ console.warn('Error showing local notice', e) }
  }
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

// Editor actions
function saveLocalSongs(){ localStorage.setItem('customSongs', JSON.stringify(songs)) }

// Sidebar toggle logic
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

// apply saved sidebar state
try{
  const savedSidebar = localStorage.getItem(SIDEBAR_KEY)
  if(savedSidebar === '1') setSidebarHidden(true)
}catch(e){}

addSongBtn.addEventListener('click', ()=>{
  const t = editTitle.value.trim() || 'Untitled'
  const a = editArtist.value.trim()
  const c = editContent.value.trim()
  songs.push({title:t, artist:a, content:c})
  renderSongList()
  saveLocalSongs()
  loadSong(songs.length-1)
})

updateSongBtn.addEventListener('click', ()=>{
  const t = editTitle.value.trim() || 'Untitled'
  const a = editArtist.value.trim()
  const c = editContent.value.trim()
  if(typeof idx === 'number' && songs[idx]){
    songs[idx].title = t; songs[idx].artist = a; songs[idx].content = c
    renderSongList(); saveLocalSongs(); loadSong(idx)
  }
})

deleteSongBtn.addEventListener('click', ()=>{
  if(!confirm('Delete this song?')) return
  if(typeof idx==='number' && songs[idx]){
    songs.splice(idx,1)
    saveLocalSongs()
    renderSongList()
    if(songs.length) loadSong(Math.max(0, idx-1))
    else viewer.innerHTML = ''
  }
})

exportBtn.addEventListener('click', ()=>{
  const json = JSON.stringify(songs,null,2)
  // download
  const blob = new Blob([json],{type:'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'songs.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  // copy to clipboard
  if(navigator.clipboard){ navigator.clipboard.writeText(json).catch(()=>{}) }
})

importFile.addEventListener('change', (e)=>{
  const f = e.target.files[0]; if(!f) return
  const r = new FileReader()
  r.onload = ()=>{
    try{ const parsed = JSON.parse(r.result); if(Array.isArray(parsed)) { songs = parsed; saveLocalSongs(); renderSongList(); loadSong(0) } else alert('Imported JSON is not an array') }
    catch(err){ alert('Invalid JSON file') }
  }
  r.readAsText(f)
})

clearLocalBtn.addEventListener('click', ()=>{
  if(!confirm('Clear locally saved songs and reload originals?')) return
  localStorage.removeItem('customSongs')
  location.reload()
})

// ensure song list highlights active
function renderSongList(){
  songListEl.innerHTML = ''
  songs.forEach((s,i)=>{
    const el = document.createElement('div')
    el.className = 'song-item'
    if(i===idx) el.classList.add('active')
    el.textContent = s.title + (s.artist? ' — '+s.artist : '')
    el.addEventListener('click', ()=>{ loadSong(i); populateEditor(i) })
    songListEl.appendChild(el)
  })
}

function populateEditor(i){
  const s = songs[i]
  editTitle.value = s.title || ''
  editArtist.value = s.artist || ''
  editContent.value = s.content || ''
}


function renderSongList(){
  songListEl.innerHTML = ''
  songs.forEach((s,i)=>{
    const el = document.createElement('div')
    el.className = 'song-item'
    if(i===idx) el.classList.add('active')
    el.textContent = s.title + (s.artist? ' — '+s.artist : '')
    el.addEventListener('click', ()=>{ loadSong(i); populateEditor(i) })
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

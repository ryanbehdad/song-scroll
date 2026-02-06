# Song Scroll (PWA) — auto-scrolling lyrics + chords

A tiny static web app you can host on **GitHub Pages** and install on Android as a **PWA** (Add to Home Screen).
It is designed for **mobile guitar practice**: big controls, offline use, optional *keep screen on*, and two scroll modes.

## Features

- **Continuous scroll** (px/sec) or **Step scroll** (scroll 1 line / 2 lines / ~1 page every X seconds)
- **Song drawer** with search
- **Settings**: font size, line spacing, chord highlighting, swipe nav, tap-to-play/pause
- **Optional Wake Lock** to keep the screen on while playing (supported in Chrome/Android)
- **Offline** caching via Service Worker (works great on GitHub Pages)

## Files

- `index.html` — UI
- `styles.css` — mobile-first styling
- `app.js` — logic (parses songs + auto-scroll + wake lock + PWA registration)
- `songs.txt` — your songs (songs separated by dashed lines)
- `manifest.webmanifest` — PWA manifest
- `sw.js` — service worker (offline cache)
- `icon.svg` — app icon (you can replace with PNGs later)

## Song format (`songs.txt`)

Songs are separated by a dashed line of 8+ dashes, e.g.:

```
My Song Title (Artist)
...lyrics with [Am] chords...

--------------------------------------------
Another Song — Another Artist
...
```

Chords go in square brackets like `[E]` inside the line.

## Deploy to GitHub Pages

1. Create a repo (for example `song-scroll`) and add these files to the repo root.
2. GitHub → **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: `main` / folder `/ (root)`
3. Open your Pages URL on your phone.

## Install on Android

- In Chrome: open the site → **⋮ menu → Add to Home screen / Install app**
- Use the app icon; it will open full-screen.
- Turn on **“Keep screen on while playing”** in Settings.

## Tips

- If your scroll speed feels too fast/slow, switch to **Step mode**:
  - e.g. *Step every 1.2s* and *1 line* is usually easy to follow while playing.
- Swipe left/right to change songs (toggle in Settings).

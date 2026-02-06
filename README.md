# Song Scroll (GitHub Pages PWA)

This is a mobile-first chord/lyrics viewer with auto-scroll.

Your GitHub Pages address:
- https://ryanbehdad.github.io/song-scroll/

## Files in this project

- `index.html` – app UI
- `styles.css` – modern mobile-first styling
- `app.js` – logic (loads and parses `songs.txt`, auto-scroll, settings, wake lock)
- `songs.txt` – your songs (same separator format as your original project)
- `manifest.webmanifest` – PWA manifest (configured for `/song-scroll/`)
- `sw.js` – service worker for offline use
- `icon.svg` – app icon

## songs.txt format

Songs are separated by a line of 10+ dashes, e.g.

----------
Title
Artist (optional)
Lyrics and chords...

----------
Next Title
...

## Auto-scroll speed

- Smooth mode uses **1–40 px/s**, default **15**.
- Speed changes in **increments of 1**.
- The app avoids `Math.floor()` when updating scroll position, so low speeds still move smoothly.

## Deploy

1. Commit all files to the repo root.
2. GitHub → Settings → Pages → Deploy from branch → `main` → `/ (root)`.
3. On Android Chrome: open the site → menu → **Install app** / **Add to Home screen**.

## Offline

After first load, the app works offline.
`songs.txt` uses a network-first strategy so updates appear after you deploy.

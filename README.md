# Song Scroll (GitHub Pages PWA)

This is a mobile-first chord/lyrics viewer with auto-scroll.

## Public Repo Safety Rule

This repository is public. Never commit private or sensitive information here.

- Do not store credentials, API keys, tokens, passwords, or private URLs.
- Do not store private personal data (emails, phone numbers, addresses, etc.).
- Keep song/content data non-sensitive and safe for public hosting.
- If anything sensitive is added by mistake, rotate/revoke it and remove it from git history.

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
Title (Artist optional in brackets)
Artist (optional second line, still supported)
@speed: 11
Lyrics and chords...

----------
Next Title
...

### Metadata lines

- `@speed: N` sets that song's default scroll speed (`N` is clamped to `1..40`).
- Recommended header format: `Song Title (Artist Name)`.

## Auto-scroll speed

- Smooth mode uses **1–40 px/s**, default **11**.
- Speed changes in **increments of 1**.
- The app avoids `Math.floor()` when updating scroll position, so low speeds still move smoothly.

## Deploy

1. Commit all files to the repo root.
2. GitHub → Settings → Pages → Deploy from branch → `main` → `/ (root)`.
3. On Android Chrome: open the site → menu → **Install app** / **Add to Home screen**.

## Offline

After first load, the app works offline.
`songs.txt` uses a network-first strategy so updates appear after you deploy.

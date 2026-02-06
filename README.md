# Song Scroll — simple auto-scrolling lyrics with chords

This is a tiny static web app to view and auto-scroll lyric+chord text. It can be hosted on GitHub Pages for free.

Files included

- `index.html` — main UI
- `styles.css` — styles
- `app.js` — client logic
- `songs.txt` — bundled song list (text file with songs separated by a long dashed line)

How songs are formatted
- Songs are stored in `songs.txt` separated by a dashed line (--------------------------------------------).
- The first non-empty line of each section is used as the song title; the second short line is used as the artist when present.
- Use square brackets for chords, e.g. `[E] There's something happening here`.

Deploy to GitHub Pages

1. Create a new GitHub repo (e.g., `song-scroll`) and push these files to the `main` branch.

```bash
git init
git add .
git commit -m "Initial song-scroll site"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

2. In the repository Settings → Pages, set Source to branch `main` and folder `/ (root)`.

Features / Tips
- The sidebar shows the list of songs parsed from `songs.txt`.
- To update or add songs, edit `songs.txt` locally and push changes to the repository (or export/replace the file on GitHub).
- Adjust `Speed` and `Font` in the sidebar; values persist in `localStorage`.
- Keyboard: space toggles Play/Pause; arrow keys navigate songs and scroll.

Optional enhancements
- Add server-side or automated builds to store each song as a separate file and generate a manifest automatically.
- Add a small admin form that posts edits to a backend (requires a server or GitHub Actions to commit changes).


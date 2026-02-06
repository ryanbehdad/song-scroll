# Song Scroll — simple auto-scrolling lyrics with chords

This is a tiny static web app to view and auto-scroll lyric+chord text. It can be hosted on GitHub Pages for free.

Files added:

- [index.html](index.html) — main UI
- [styles.css](styles.css) — styles
- [app.js](app.js) — client logic
- [songs.json](songs.json) — song data (add your songs here)

How songs are formatted
- Each song is an entry in `songs.json` with `title`, optional `artist`, and `content` (string).\n- Use square brackets for chords, e.g. `[E] There's something happening here`.

Deploy to GitHub Pages

1. Create a new GitHub repo (e.g., `song-scroll`) and push these files to the `main` branch.

```
git init
git add .
git commit -m "Initial song-scroll site"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

2. In the repository Settings > Pages, set source to `main` branch and `/ (root)` folder. Wait a minute and your site will be available at `https://<your-user>.github.io/<your-repo>/`.

Tips
- To add songs, edit `songs.json` and push. Each `content` string supports newlines and chord markup in `[]`.
- Adjust `Speed` and `Font` in the sidebar; values persist in `localStorage`.
- Use spacebar to toggle play/pause, arrow keys to navigate songs.

If you want, I can:
- Add a small admin form to add songs from the browser.
- Convert to individual song files and auto-generate a manifest.

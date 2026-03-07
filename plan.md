# Song Scroll Improvement Plan (Top 10)

## Context (Current App Research)
- Platform: static GitHub Pages PWA (`index.html`, `styles.css`, `app.js`, `sw.js`).
- Primary use case: mobile live performance teleprompter for chords/lyrics.
- Current strengths:
  - Fast startup, no backend, offline support via service worker.
  - Smooth auto-scroll with 1-40 px/s controls and progress slider.
  - Song list/search, next/prev navigation, swipe and keyboard support.
  - Wake Lock support to reduce screen sleeping during playback.
- Current friction:
  - Some controls are low-value for primary mobile flow.
  - Artist parsing is heuristic and can miss title-embedded artists.
  - Wake lock + playback behavior can be clearer and more resilient.
  - No explicit in-app guardrails around public-data safety.

## Product Direction
- Keep it simple, mobile-first, and reliable.
- Prioritize: fast song switching, stable scrolling speed, and screen-awake behavior.
- Remove or de-emphasize low-frequency controls.

## Top 10 Changes (Priority Order)

1. **Canonical song metadata parsing (Title + Artist)**
- Change parser to infer artist from title line when formatted like `Song Title (Artist Name)`.
- Keep backward compatibility with current "second line artist" format.
- Acceptance: songs with title-bracket artists always display correct title and artist.

2. **Keep Awake default ON**
- Wake lock preference defaults to enabled for new users.
- UI clearly reflects awake state while playing.
- Acceptance: fresh install starts with awake enabled.

3. **Delayed scroll start for first lines (5s)**
- Add a pre-roll delay before scrolling begins after Play.
- Show a visible countdown (for example, 5..4..3..2..1).
- Pause/Stop during countdown cancels start.
- Acceptance: first lines remain visible for about 5 seconds after pressing Play.

4. **Per-song default playback speed in songs.txt**
- Add a metadata line format distinct from lyrics.
- Format: `@speed: 15` near the song header.
- Parser reads and applies this speed whenever that song is loaded.
- Acceptance: each song can define its own default speed.

5. **Simplify bottom controls to essentials**
- Keep only: Prev, Play/Pause, Next, Speed (- / value / +), Progress, Top.
- Move secondary settings out of main path.
- Acceptance: one-thumb mobile usage without opening settings for normal playback.

6. **Improve wake-lock reliability and clarity**
- Make awake state deterministic while playing when enabled.
- Add clear status text for unsupported wake lock.
- Avoid conflicting release/reacquire logic.
- Acceptance: during active playback, supported devices stay awake consistently.

7. **Add "quick start playback" behavior per song**
- Option: auto-start scroll when a song is selected (default ON for mobile flow).
- Keep one-tap override through Play/Pause.
- Acceptance: choose song -> scrolling starts immediately unless disabled.

8. **Persist per-song playback position (optional, lightweight)**
- Save scroll position per song locally and restore when returning.
- Include "reset song position" action.
- Acceptance: switching songs and returning resumes prior position.

9. **Make speed more musically predictable**
- Keep px/s control, but add tiny "tempo presets" (Slow/Medium/Fast) mapped to px/s.
- Preserve manual fine-tuning.
- Acceptance: user can start with one tap, then fine-adjust.

10. **Public-data safety guardrails**
- Add permanent policy reminders in repo docs and editing guidance.
- Ensure no feature encourages storing private data.
- Acceptance: public-repo safety rule is visible to future contributors.

## Suggested Implementation Order
1. Metadata parser + tests/manual fixtures.
2. Keep awake default ON + wake-lock cleanup.
3. Add delayed scroll start with countdown.
4. Add per-song speed metadata parsing and apply on load.
5. Add `@speed:` metadata to all songs in `songs.txt`.
6. Control simplification and mobile layout pass.
7. Quick-start playback.
8. Per-song resume.
9. Speed presets.
10. Final doc/polish.

## Rollback Strategy (Before Any Feature Work)
- Create a safety tag and branch before implementation:
  - `git checkout -b backup/pre-feature-upgrade`
  - `git tag pre-feature-upgrade`
  - `git push origin backup/pre-feature-upgrade --tags`
- Then implement on a separate feature branch.
- If broken:
  - Immediate rollback on main: `git revert <bad_commit>` (safe, non-destructive history).
  - Full rollback to known good: redeploy from `pre-feature-upgrade` tag/branch.

## Notes for Next Step
- After you edit this plan, I can execute it step-by-step and keep each step isolated in commits so rollback stays easy.

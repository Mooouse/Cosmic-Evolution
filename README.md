# Cosmic Evolution — From Dust to Infinity

A complete **2D HTML5 Canvas** cosmic growth game. The old Garage Evolution source files have been replaced on the main branch, as requested. No 3D models, no build step, no heavy engine, no external gameplay dependencies.

## Play

Open `index.html` in a browser, or use GitHub Pages. Controls: mouse or touch drag to move, WASD/arrow keys to steer, `E` gravitational pulse, `Shift`/`Space` dash, `M` evolution map, `P` pause.

## Systems implemented

- Procedural starfield and nebula rendering, multi-layer parallax, orbit effects, energy trails, screen shake, particles, impact and evolution effects.
- Gravity and absorption physics, rare relics, hazards, active pulse and boost abilities.
- **28 evolution forms**, dust to universe, in six distinct epochs; stage objectives and stage-specific mass requirements.
- Four permanent upgrades with geometric cost scaling; stage-based resource economy.
- Auto-save using localStorage, settings, survival stats, map, and completion screen.
- Responsive keyboard, pointer, and mobile touch controls.
- Static deployment; no advertisements, trackers, or cloud calls. Google Fonts are optional; the game falls back to local fonts offline.

## Progression / game length

The content and high growth costs of later forms are meant to create a long-term **10+ hour target campaign**. Real playtime depends on skill, route, upgrade strategy, and device performance. **This is a design target, not a verified minimum**; it requires full playtesting and balance passes before a guarantee of a ten-hour minimum can be made.

Progress is saved under `cosmic-evolution-save-v1` in local browser storage. To reset during testing, remove that localStorage key in your browser console.

## Deploy

All game files are static. The included GitHub Actions workflow runs a syntax/smoke test and deploys the root folder to GitHub Pages. On GitHub, set **Settings → Pages → Build and deployment → Source: GitHub Actions** if it isn't already selected. The workflow retains its deploy artifacts for one day, and removes the temporary archive following successful publication, to reduce artifact storage usage.

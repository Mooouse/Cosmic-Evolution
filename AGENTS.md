# Project rules

- Preserve flat 2D, strict side-profile vehicle art facing right. Never switch to 3D.
- User-facing vehicle names must be fictional. No real manufacturer logos or badges.
- Production car artwork must match its real prototype; do not present procedural placeholder illustrations as exact realistic assets.
- One clean transparent image per vehicle. Matched round wheels. Smooth high-quality edges and crisp carbon texture if present.
- Cars only on Earth; ships only in space. Ships have no wheels; service thrusters instead.
- Keep each garage's tools, robots, work and earnings independent; returning to a garage must retain them.
- English is the fresh-account default. Update English, Russian and Spanish together.
- Keep progression, collection, daily rewards and prestige semantics stable across releases; version and migrate saves when necessary.
- Test modified gameplay and fix discovered failures. Run `npm test` and `npm run check` before publishing.
- Do not reward failed, cancelled or duplicate ads. Keep gameplay and input paused throughout ad requests/playback; mute only when ads start. Respect CrazyGames muteAudio and disabled SDK environments.
- CrazyGames uses SDK.data as the authoritative store; never silently replace a failed cloud read with a local save.
- Target GitHub repository and GitHub Pages, plus a CrazyGames upload package. Avoid adding unrelated hosting services.

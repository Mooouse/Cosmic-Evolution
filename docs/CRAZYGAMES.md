# CrazyGames SDK integration

Implemented against the official HTML5 SDK v3 documentation, checked 2026-10-18:

- https://docs.crazygames.com/sdk/intro/
- https://docs.crazygames.com/sdk/game/
- https://docs.crazygames.com/sdk/video-ads/
- https://docs.crazygames.com/sdk/data/
- https://docs.crazygames.com/requirements/ads/

## Lifecycle

`js/platform.js` loads `https://sdk.crazygames.com/crazygames-sdk-v3.js` and awaits `SDK.init()` before SDK operations. Loading, active workshop gameplay, menus and results emit the respective lifecycle events without duplicate start/stop calls. Unlocking a location and evolution use happytime sparingly. Focus changes do not emit gameplay events; the platform handles focus.

`game.settings.muteAudio` and its change listener override both in-game audio sliders. Audio still needs a user gesture for browser autoplay policies.

On unrelated hosts the SDK is disabled and the game uses local storage. On CrazyGames the SDK Data Module is authoritative for both guests and signed-in players. A failed cloud read does not trigger a fallback write that could erase account progress. The SDK handles reload on authentication changes.

## Rewarded advertisements

An optional, clearly marked double-payment offer appears on every third manually completed order, subject to a 90-second local offer cooldown and SDK availability. It appears only on the results screen. Continue has the same size, typography and colour as the ad offer. Normal progression does not require ads. No external ad providers, banners or forced midgame interruptions are included.

- Request: block game input and simulation.
- `adStarted`: suspend sound/music.
- `adFinished`: pay the receipt's bonus once, persist it and show confirmation.
- `adError`, adblock, no fill, Basic Launch, exception or timeout: no bonus; release input and resume.
- Basic Launch / adblock errors hide further offers for the session.
- No robot production is credited for time spent waiting for or watching an ad.

The basic salary for the repair is already credited before the optional offer. Closing the offer cannot lose it.

## Submission configuration

1. Run `node scripts/build.mjs` or download `crazygames-upload` from GitHub Actions.
2. Upload the ZIP with `index.html` at its root to CrazyGames Developer Portal.
3. Set **Progress Save → Yes, using the Data Module from the CrazyGames SDK**. Otherwise cloud saving is disabled.
4. In CrazyGames Preview verify loading/gameplay events, muted audio, each ad callback, blocked/disabled ads, reload persistence and signed-in sync.
5. Verify mobile landscape/portrait sizing, pointer/touch controls and language switching.
6. Replace temporary transport artwork and complete real-device playtesting before submitting for production review.

`?useLocalSdk=true` enables the SDK's documented local testing environment on a non-CrazyGames host; demo ad callbacks there are test behaviour, not real monetization.

## Verification limits

The SDK adapter is unit-tested with controlled SDK responses. Actual CrazyGames Preview, advertisement fill, review acceptance and account synchronization require running on the platform and have not been claimed as verified.

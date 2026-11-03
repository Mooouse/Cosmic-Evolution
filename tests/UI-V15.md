# UI v15.3 integration — game v3.38.0

The approved `Infiniti_Space_UI_v15_3_Slider_Aligned.html` supplies the layouts, icons and stylesheet. Its demo runtime, sample economy, synthetic previews and fake atlas are not executed.

`ui-v15-templates.js` contains the layouts and translations. `ui-v15.css` preserves the reference styles; `ui-v15-adapter.css` adapts real game content and small screens. `ui-v15-bridge.inc.js` is mirrored inside the game closure so existing state, save data and actions remain authoritative.

Connected: menu/pause, live HUD, infinite bulk upgrades, evolution recipe, achievement progress and rarity filters, bestiary, statistics, settings, music, tutorial, and the real atlas with its existing marker editor and smooth recentering. The 7 future audio files remain unavailable until supplied. The 27-stage pacing and physics are unchanged.

Validation:
- JavaScript syntax and full existing regression suite.
- Browser: menu navigation, actual HUD and resource values, evolution materials/tasks, upgrade quotes, map canvas and right-click marker editor.
- Browser: music volume changed to 25%, then retained after reload; automatic quality reduction remains off.
- Browser: 360×640 and 390×844 menu/settings/music layouts, scrollable settings and aligned volume controls.
- Extra fix: removed stray settings-control bindings from the final evolution dialog; that dialog has no such controls.

`tests/responsive.html` loads the actual game in selectable phone/tablet viewport sizes. UI bridge behavior requires browser checks; the legacy VM harness intentionally skips the DOM-template adapter.

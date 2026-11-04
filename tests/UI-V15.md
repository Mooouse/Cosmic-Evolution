# v15.3 integration audit — release 3.38.2

Source: Infiniti_Space_UI_v15_3_Slider_Aligned.html.

## Restored components
- Menu: SVG button glyphs, language popup dismissal, journey footer and real progress.
- Gameplay: upgrade drawer with real purchases, ability feedback, mass unit and recipe shortcut.
- Settings: reference custom dropdowns, keyboard navigation, sliders and switches bound to saved values.
- Upgrades: real unlimited-level bulk quotes and effective power.
- Evolution: emphasized heading, stage strip, material rows and objective footer.
- Achievements: original row structure, rarity glyphs, colours and real progress filters.
- Bestiary: selectable entries and real descriptions.
- Statistics: readable labels and adjacent, restrained numeric values.
- Music: eight original SVG covers, transport icons, owned/selected/coming-soon states. Seven tracks remain unavailable until audio is supplied.
- Map: reference marker palette bound to persistent map pins; matching purple map palette. Actual world positions and scale remain authoritative.
- Tutorial: reference cards with real controls and progression instructions.

## Mobile
Compact HUD at 360/390 px and landscape 844 x 390: safe-area margins, 144 px stick (122 px landscape), 60 px thumb, 62 px ability buttons, collapsed camera controls and quick-upgrade drawer. Touch origin is relative to initial contact, 5 px dead zone, one captured pointer; cancellation resets input. Secondary touches cannot steal steering.

## Validation
- node --check game.js and ui-v15-behaviors.js
- node tests/regressions.cjs
- node tests/joystick.cjs: dead zone, relative origin, speed clamp, diagonal normalization, second-pointer isolation, pointer cancellation and stopped-game input.
- Browser: settings dropdown/Escape and audio tab, music covers/player, evolution recipe, bestiary selection, achievement rarity filter, mobile tutorial/gameplay/upgrades/camera/map, named coloured marker creation.
- Responsive viewport checks: 390 x 844, 360 x 640, 844 x 390. These are browser viewport checks, not physical iOS/Android device certification.

The reference uses CSS hover/active/transitional states, not keyframe animations. Its mock economy, fake audio progress and lab screen switcher are deliberately not executed in the production game.

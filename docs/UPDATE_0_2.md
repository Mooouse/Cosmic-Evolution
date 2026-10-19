# Workshop update 0.2

- The workshop is the dominant screen area. Four labelled destinations replace the permanent sidebar. Tools and crew have a separate upgrades screen; collection, achievements, statistics and settings remain in the main menu.
- Every destination has its own flat 2D wall, window, lighting, signage and color treatment. Cars enter from the side and leave after delivery; interaction is locked during movement.
- Smooth strokes remove dirt/rust and apply paint. Stroke coverage and marks are saved. Approved image alpha excludes invisible areas from the cleaning target.
- Wheel service: undo five fasteners, drag the old part to the tray, mount a new part, tighten five fasteners. Spacecraft use a thruster module.
- Engine service: match three colored/symbol connectors, then perform three timed engine tests. Keyboard alternatives remain available.
- Five specialist professions are purchased per garage. Animated chassis and articulated arms carry profession tools, including a paint gun. Specialists operate on the player's current job through the same repair functions; manual work can complete other fasteners or areas simultaneously.
- The visible garage receives no independent batch payout. Other garages keep their own staff and work. An incomplete crew stops at an unstaffed required task. A full crew can deliver automatically. The displayed passive rate is the base rate for an unattended five-stage order; optional stages and player help make real orders faster.
- Old universal robot purchases remain valid: each legacy robot is represented by a full set of professions. New hiring is per profession. Existing currency, garages, collection, jobs and upgrades remain compatible with v1 saves.
- The first five approved car images are included as transparent WebP delivery assets. Remaining illustrations are provisional; the 200-image production pass is not complete.

## Verification

31 Node tests cover the economy, saves, SDK, coating coverage, ordered part replacement, wiring, specialist ownership, cooperative progress, stale robot operations and duplicate payouts. Local DOM simulation also covers navigation, hiring, EN/RU switching, save persistence, and the complete repair/delivery/next-order flow. This is not a real-browser layout or touch-device test. Browser QA and CrazyGames Preview are still required before submission.

The earlier balance simulation models universal robots. Specialist pacing needs a new player-informed balance pass; do not present the old simulation's completion hours as validation of this update.

## 0.2.1 — Lo-fi soundtrack

Original 72 BPM loop with swung eighths, soft electric keys, seventh/ninth chords, warm bass, kick/snare/hi-hat and subtle vinyl texture. Music volume, platform mute, background suspension and ad pause remain supported. Two audio scheduling tests supplement the 31 gameplay/platform tests.

## 0.2.2 — Individual robot crew and manipulator rigs

- Every purchased specialist now has a separate visible rig, including waiting units in wall docks. Up to 30 rigs are represented; up to six specialists work concurrently in their profession.
- Work reservations split coating regions, bolts and engine connectors between units. Part replacement and engine calibration remain single-target operations. Individual action timing prevents crew strength being counted twice; manual assistance still uses the same job state.
- Tracked bases, articulated upper arms, telescoping forearms and profession-specific tools replace the old character. Tool coordinates come from the actual vehicle surface or repair control. SVG elements are retained between frames, with only active joints updated.
- Fixed an undefined timestamp in the tab visibility handler that could stop the animation loop after returning to the game. Pauses cancel pending reservations, and resuming starts exactly one animation loop.
- Saves and earlier robot purchases remain compatible. Original procedural Lo-Fi replaces the old music loop; music volume, ad pause and platform mute remain supported.

Validation: 39 Node tests, JavaScript syntax checks, static build, and DOM simulation of 30 visible rigs, six simultaneous washers, tab hide/show and multiple automatic orders. New rig SVGs were also rasterized and inspected. DOM simulation and SVG inspection do not replace real-browser layout, audio or touch-device QA.

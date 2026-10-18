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

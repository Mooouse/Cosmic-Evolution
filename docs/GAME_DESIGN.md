# Game systems and initial balance

## Restoration

Each order always requires washing and rust/hull repair. It may additionally require wheel/thruster service, engine/reactor calibration and repainting. The introductory order includes all five stages.

Washing, sanding and painting require visiting new body cells; repeatedly rubbing a single cell cannot finish a job. Better tools cover more progress per cell. The wheel/thruster mini-game requires a five-point fastening order. Engine calibration needs three successful timed presses; upgrades widen the success window. Optional tasks are skipped. Payment requires all required work, and delivery is idempotent.

All vehicles enter in flat side profile, facing right. Display names are fictional, and there are no manufacturer badges. The collection separates seen and repaired counts. Robots can also discover and restore collection models.

## Network

There are 17 garages: 8 terrestrial and 9 space locations. All four outer gas/ice giant facilities are orbital; Venus uses an aerostat. Titan is a moon of Saturn, not a planet. Space pools never contain cars, and spacecraft artwork has thrusters instead of wheels.

Each garage has its own five tools (levels 1–10), robots (0–6), robot level (1–10), queued manual order, completed count, automatic work progress and earned credits. Tools and staff do not transfer when travelling.

A robot needs 240 seconds per restoration at level 1. Robot and tool upgrades shorten this. Automatic and manual work use separate bays: automation never consumes the player's partly completed job. The map's per-minute estimate is exact average production; actual credits arrive when a vehicle completes.

Closing the game credits at most eight hours of robot production. Session time, clocks moving backwards, fractional production and repeat loading are handled explicitly. Offline money is already included when the welcome-back panel appears; the collect button cannot pay twice.

## Progression and economy

Later locations require both a credit price and a quota of contracts in the preceding garage. Repairs performed by robots count toward the quota. The quota prevents a large income multiplier from skipping the entire location ladder immediately.

Initial values are in `GARAGES` in `js/engine.js`. Tool price grows by 1.85 per level, robot purchase price by 2.25 per unit, robot upgrade price by 2 per level. Purchasing is checked in the engine; UI buttons alone are not the authority.

**Initial simulation, not a human playtest:** the deterministic strategy in `scripts/simulate-balance.mjs` uses four robots, robot level six, tools level three, one hour of initial manual work and short sessions thereafter. With uninterrupted robot production, no ads and no prestige it reaches Titan at approximately 416 hours. Two evolutions (at the Moon and Jupiter) lower that estimate to approximately 153 hours. A more efficient strategy and different play frequency change this substantially; do not advertise an exact completion time. The eight-hour offline cap can lengthen real calendar time.

This is intended to be a multi-day progression game. More telemetry and real playtesting are needed to establish retention and avoid late-game stalls. No real-money economy exists.

## Evolution

Available after owning Neon Works and earning at least 10 million credits during the run. Expertise gained is `floor(sqrt(runEarnings / 10,000,000))`; each point adds 25% to base income, additively with existing points.

Resets: money, garages, tools, robots, orders and current-run earnings. Keeps: expertise, lifetime statistics, collection, claimed achievements, daily streak and language/audio settings. A newly rebuilt first garage always has a valid starting order.

## Daily rewards and achievements

Local calendar days control the seven-day reward cycle. Multiple claims on the same day and clock movement backwards do not pay again. A missed day resets the streak; the seventh reward is larger. Rewards scale with the best owned garage and expertise. A client-only game cannot prevent deliberate device-clock or save-file editing; no anti-cheat claims are made.

Achievements pay once and remain claimed after evolution. Statistics cover manual/automatic restorations, washing, removed rust, repairs, painting, ships, robots, earnings/spending, offline income, daily claims, evolutions, active workshop time and rewarded ads.

## Save format

Version 1, one serialized state under `garage-evolution.save.v1`, well below the CrazyGames 1 MB limit. Autosave every 10 seconds, on consequential actions and page exit. Import validates shape and value ranges and asks before replacing progress. Invalid original saves are protected from automatic overwrite. Export is plain JSON for backup and transfer.

## Release gaps

- 112 approximate SVG car illustrations must be replaced by individually checked realistic likenesses of their prototype models, without real names or logos.
- 100 ship illustrations are generated from varied vector hull families; final individual art needs production review.
- Browser visual/touch QA and CrazyGames Preview acceptance are still required.
- Progression figures are model estimates, not measured player outcomes.

# Campaign pacing — v3.37.2

Removed the flat required/30 reward from v3.37.1. Campaign rewards now use relative body area and individually calibrated coefficients. Black-hole rewards are unchanged. No time gate or passive income.

Validation: continuous simulation from dust to black hole using the real update, movement, generation, absorption, recipes and depleted-world state. Nearest-edible-target pilot, no upgrades, normal loot, 10 Hz physics. Rival-hole deaths disabled to isolate gathering; rendering skipped. This is a reproducible pacing probe, not a human playthrough or a guarantee for every route.

Run `node tests/pacing.cjs` with @napi-rs/canvas installed (or CANVAS_MODULE set to its module path). Optional CHECKPOINT_DIR and RESUME support saved probe checkpoints.

| Completed form (1-based) | Seconds |
|---|---:|
| 1 | 58.3 |
| 2 | 52.5 |
| 3 | 53.2 |
| 4 | 54.5 |
| 5 | 40.5 |
| 6 | 60.0 |
| 7 | 73.5 |
| 8 | 58.2 |
| 9 | 76.7 |
| 10 | 82.7 |
| 11 | 60.7 |
| 12 | 53.6 |
| 13 | 55.0 |
| 14 | 62.2 |
| 15 | 54.3 |
| 16 | 56.6 |
| 17 | 50.5 |
| 18 | 54.0 |
| 19 | 55.0 |
| 20 | 59.1 |
| 21 | 62.1 |
| 22 | 68.8 |
| 23 | 59.0 |
| 24 | 60.8 |
| 25 | 77.3 |
| 26 | 55.1 |
| 27 | 71.0 |

Total: 1625.2 seconds (27.09 minutes). Range: 40.5–82.7 seconds.

Regression suite: relative-area rewards across all 27 transitions, unchanged endless rewards, upgrade pricing, physics and rendering guards pass.

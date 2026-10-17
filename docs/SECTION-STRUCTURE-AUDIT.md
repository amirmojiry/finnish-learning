# Planned versus shipped Finnish course structure

[English delivery roadmap](ROADMAP.md) · [فارسی](ROADMAP.fa.md) · [Parent #101](https://github.com/amirmojiry/finnish-learning/issues/101) · [R3 #186](https://github.com/amirmojiry/finnish-learning/issues/186)

This is an automatically generated inventory. **Only shipped JSON manifests count as playable lessons.** Design outlines are not interpreted as deployed content or learner proficiency.

## Summary

| Measure | Count |
| --- | ---: |
| Planned curriculum section slots | 44 |
| Shipped/playable sections | 14 |
| Shipped/playable lessons | 140 |
| Outline-only sections with authored non-playable lessons | 2 |
| Non-playable lesson outlines (not shipped) | 20 |
| Plan-only section slots with no shipped manifest | 28 |

## Levels

| Level | Planned section slots | Shipped sections | Playable lessons | Outline-only sections | Plan-only slots |
| --- | ---: | ---: | ---: | ---: | ---: |
| A1.1 | 4 | 4 | 40 | 0 | 0 |
| A1.2 | 4 | 4 | 40 | 0 | 0 |
| A1.3 | 4 | 4 | 40 | 0 | 0 |
| A2.1 | 4 | 2 | 20 | 2 | 0 |
| A2.2 | 4 | 0 | 0 | 0 | 4 |
| B1.1 | 4 | 0 | 0 | 0 | 4 |
| B1.2 | 4 | 0 | 0 | 0 | 4 |
| B2.1 | 4 | 0 | 0 | 0 | 4 |
| B2.2 | 4 | 0 | 0 | 0 | 4 |
| C1 | 4 | 0 | 0 | 0 | 4 |
| C2 | 4 | 0 | 0 | 0 | 4 |

## Structural contract

- A section's shipped lesson count is derived from its authored ordered `lessons` and matching curriculum lessons (not a fixed 10).
- The final authored lesson is the checkpoint, whatever its ordinal. Its original assessment coverage is required.
- Progress fraction, map connectors, previous/next navigation and section unlocking continue to use the shipped lesson array.
- The existing fourteen shipped sections and their 140 saved lesson IDs are unchanged by this structural release.
- Current A2.1 Sections 3–4 remain outline-only; no third section is made playable.

Rebuild: `npm run r3:structure:write`. Validate: `npm run r3:structure:check`.

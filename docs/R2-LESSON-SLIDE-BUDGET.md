# R2: Learner fatigue and authored lesson slide budget

Parent: [#101](https://github.com/amirmojiry/finnish-learning/issues/101). Implementation: [#126](https://github.com/amirmojiry/finnish-learning/issues/126).

## Measured shipped baseline (2026-10-18)

Direct inspection of the 14 shipped section JSON manifests (140 lessons) finds **55 lessons with more than 30 authored activity entries**, including **four with more than 40**. The longest has **62** (A1.1 Section 2 Lesson 10); A1.1 Section 3 Lesson 9 and Section 4 Lesson 9 have 48 each, and A1.2 Section 2 Lesson 7 has 44. These are authored entries, not observed session durations or user fatigue measurements.

## Policy

For future authored or explicitly migrated lessons, aim for **12–20 visible activity screens**; 21–25 is intensive, **30 is the validation maximum**. A provisional **8–12 minutes** is a UX target, not a measured or scientifically fixed limit. Review duration, mistakes and abandonment once privacy-respecting telemetry is available.

Existing deployed lesson entries retain their original lengths and stable identifiers; legacy over-budget entries are not deleted, clipped or split implicitly. Set `activity_budget_policy: "enforced"` when opting a historical lesson into the stricter budget. New section/lesson IDs are checked against the 30-slide maximum automatically. Only the existing shipped section/lesson ID combinations are grandfathered. Legacy generated activities remain 15 where the generator already used 15. The checkpoint requirement of fifteen *target identities* is separate from the number of slides.

An activity screen is not necessarily a single assessment answer. Future grouped matching, multi-blank and sorting exercises must grade each response independently and retain evidence of productive retrieval, grammar, dictation and listening. **This structural R2 change does not implement those new exercise UI types**. Design and ship grouped types in a separately tested PR with mobile/RTL and accessibility checks.

## Remediation order

Audit >30 outliers by length, teaching-card repetition, review opportunities and grammar coverage; simplify or bundle only when independent assessment is preserved. Use R3 variable section lengths to split genuinely overlong content along coherent objectives. Existing user progress identifiers and schedules require explicit migration plans for any later editorial restructure. Keep A2.1 Section 3 behind parent release gates.

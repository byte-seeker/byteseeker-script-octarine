# MVP - Byteseeker Octarine Scripts

## Status Tracking
- [x] Fix Pudge Hook Combo bugs (2026-06-16)
    - [x] Fix tracking freeze in `tracker.ts` by resetting samples and update timestamp when time delta `dt < 0` (e.g. game restart or demo reset)
    - [x] Fix vulnerability logic bug in `castHook` in `abilities.ts` to allow hooking stunned/vulnerable targets at a distance, while keeping it disabled only if the target is already being hooked or is within Dismember range when Dismember is ready
- [x] Fix Pudge Hook prediction against charging Spirit Breaker (2026-06-16)
    - [x] Override target velocity in `getVelocity` inside `tracker.ts` using `entity.Forward * entity.MoveSpeed` when target is a charging Spirit Breaker (`IsChargeOfDarkness` or has `"modifier_spirit_breaker_charge_of_darkness"`).
    - [x] Bypass direction stability checks in `isDirectionStable` inside `tracker.ts` to return `true` for a charging Spirit Breaker.
- [x] Add dynamic Radius feature under Byteseeker menu (2026-06-16)
    - [x] Implement menu options for Dynamic Attack Range toggle, Style selection dropdown (normal/rope), and ColorPicker for circle color.
    - [x] Create `radius.ts` with PostDataUpdate hook using `ParticlesSDK.DrawCircle` to dynamically draw the attack range circle around the local hero.
    - [x] Fix Radius position not sticking to local hero by changing particle attachment from default `PATTACH_ABSORIGIN` to `PATTACH_ABSORIGIN_FOLLOW`.
    - [x] Import `radius` script in `index.ts`.
    - [x] Move Radius menu under Utility (hierarchy: Byteseeker -> Utility -> Radius) (2026-06-17)
- [x] Clean up unused utilities (2026-06-17)
    - [x] Remove unused AutoBootsUtility from `index.ts`.
- [x] Implement Counter Items feature (2026-06-17)
    - [x] Create `counter_items.ts` with comprehensive logic mapping hero/item counters and responsive HUD UI.
    - [x] Add counter_items import in `index.ts`.
    - [x] Update Counter Items UI: Rename header to "Counter Items" and render the countered hero & reason side-by-side to the right of each item (2026-06-17)
    - [x] Add row index numbering (1., 2., etc.) on the absolute left of each counter item suggestion (2026-06-17)
- [x] Dynamically fetch Pudge Meat Hook collision radius (2026-06-17)
    - [x] Remove hardcoded `hookCollisionRadius` slider from Pudge Hook settings in `config.ts`.
    - [x] Refactor `isHookBlocked` signature in `tracker.ts` to accept the hook ability directly, and update calls in `abilities.ts`, `auto_ks.ts`, and `auto_hook.ts` to pass the hook object, keeping the arguments clean and following DRY.
    - [x] Update Hook Stability description text from 0.3s to 0.45s in `config.ts` to align with the actual `STABILITY_WINDOW`.






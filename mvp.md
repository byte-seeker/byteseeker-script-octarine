# MVP - Byteseeker Octarine Scripts

## Status Tracking
- [x] Fix Pudge Hook Combo bugs (2026-06-16)
    - [x] Fix tracking freeze in `tracker.ts` by resetting samples and update timestamp when time delta `dt < 0` (e.g. game restart or demo reset)
    - [x] Fix vulnerability logic bug in `castHook` in `abilities.ts` to allow hooking stunned/vulnerable targets at a distance, while keeping it disabled only if the target is already being hooked or is within Dismember range when Dismember is ready
- [x] Fix Pudge Hook prediction against charging Spirit Breaker (2026-06-16)
    - [x] Override target velocity in `getVelocity` inside `tracker.ts` using `entity.Forward * entity.MoveSpeed` when target is a charging Spirit Breaker (`IsChargeOfDarkness` or has `"modifier_spirit_breaker_charge_of_darkness"`).
    - [x] Bypass direction stability checks in `isDirectionStable` inside `tracker.ts` to return `true` for a charging Spirit Breaker.


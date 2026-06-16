# MVP - Byteseeker Octarine Scripts

## Status Tracking
- [x] Fix Pudge Hook Combo bugs (2026-06-16)
    - [x] Fix tracking freeze in `tracker.ts` by resetting samples and update timestamp when time delta `dt < 0` (e.g. game restart or demo reset)
    - [x] Fix vulnerability logic bug in `castHook` in `abilities.ts` to allow hooking stunned/vulnerable targets at a distance, while keeping it disabled only if the target is already being hooked or is within Dismember range when Dismember is ready

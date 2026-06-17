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
- [x] Dynamically fetch Pudge Meat Hook collision radius & speed (2026-06-17)
    - [x] Remove hardcoded `hookCollisionRadius` slider from Pudge Hook settings in `config.ts`.
    - [x] Refactor `isHookBlocked` signature in `tracker.ts` to accept the hook ability directly, and update calls in `abilities.ts`, `auto_ks.ts`, and `auto_hook.ts` to pass the hook object, keeping the arguments clean and following DRY.
    - [x] Remove hardcoded `HOOK_SPEED` from `tracker.ts` and fetch it dynamically using `hook.GetBaseSpeedForLevel(hook.Level)` inside `calcCastPos` for hook prediction intercept calculation.

    - [x] Update Hook Stability description text from 0.3s to 0.45s in `config.ts` to align with the actual `STABILITY_WINDOW`.
    - [x] Fix ESP hook trajectory line to draw whenever the target is in range, rather than only when holding the combo hotkey.
- [x] Implement Smart Hook Cancel / Anti-Waste Hook feature (2026-06-17)
    - [x] Add toggle option `cancelEnabled` in Pudge Hook settings in `config.ts`.
    - [x] Add properties `lastHookTargetIndex` and `lastHookCastPos` to `PudgeState` inside `state.ts`.
    - [x] Save active hook target & cast position on all cast Hook triggers (`castHook`, `runAutoKillSteal`, `runAutoHook`).
    - [x] Implement cancellation evaluator `runHookCancel` & trigger `cancelHook` inside `abilities.ts` checking target state, visibility, magic immunity, blink distance shift, and paths blocking.
    - [x] Block immediate recasting using `800ms` sleep cooldowns on target routines to prevent suspicious twitches and remain undetected.
    - [x] Add dynamic configuration toggles `cancelOnImmune`, `cancelOnInvisible`, `cancelOnEul`, and `cancelOnBlink` in `config.ts` to allow users to customize cancellation behaviors.
    - [x] Implement target cyclone checks (Eul's Scepter, Wind Waker, Brewmaster Storm Cyclone) inside `runHookCancel` in `abilities.ts` under the `cancelOnEul` toggle.
- [x] Implement Auto Meat Shield (Flesh Heap) Active Helper (2026-06-17)
    - [x] Create configuration node and options (`meatShieldEnabled`, `meatShieldOnProjectile`, `meatShieldOnHpDrop`, `meatShieldHpThreshold`, `meatShieldOnZeusUlt`) in `config.ts`.
    - [x] Track Pudge's HP from previous frames and add TickSleeper inside `state.ts`.
    - [x] Implement `runAutoMeatShield` in `abilities.ts` triggering on incoming projectiles, HP drops, and enemy Zeus casting Thundergod's Wrath.
    - [x] Integrate `runAutoMeatShield` invocation inside the PostDataUpdate hook of `index.ts`.
    - [x] Refactor enemy ultimate triggers (Zeus/Lina/Lion) to use a single `AddDynamicImageSelector` grid in Pudge config.
- [x] Implement Enhanced ESP: Blocker Highlights & Predicted Intercept (2026-06-17)
    - [x] Add configuration option `espShowBlockers` in `config.ts`.
    - [x] Implement `getHookBlocker` in `tracker.ts` returning the creep or hero entity blocking the trajectory.
    - [x] Implement premium 3D world projection circle drawing connecting points via lines.
    - [x] Render hook prediction target intercept ring as a 3D ground circle scaled to hook's real level collision radius.
    - [x] Render blocker highlight as a 3D red ground circle scaled to blocker's actual hull radius.
    - [x] Update trajectory line to a premium dashed line with color-coding: Neon Green (stable & clear), Orange (unstable & clear), Crimson Red (blocked).
    - [x] Add spell icon texture to Pudge "Hook Settings" node in menu config.
- [x] Implement Auto Item Activation feature (2026-06-17)
    - [x] Create configuration node and options for Eul/Wind Waker, BKB, Lotus, Blade Mail, Glimmer, and Pipe in `items/auto_items.ts`.
    - [x] Implement dynamic logic to monitor enemy ultimate casts (Zeus, Lina, Lion) and incoming targeted spell projectiles.
    - [x] Cast appropriate items using custom latency buffers and sleep durations to remain undetected.
    - [x] Add auto_items import in `index.ts`.
    - [x] Refactor items list toggle and priority ordering to use `AddDynamicImageSelector` grid.
    - [x] Refactor item triggers/conditions in sub-menus to use `AddDynamicImageSelector` visual grids.
- [x] Add Strength attribute icon & fix Pudge config type errors (2026-06-17)
    - [x] Add Strength attribute icon image using `ImageData.Icons.primary_attribute_strength` on `.AddNode("Strength")`.
    - [x] Resolve compilation error in Pudge configuration by replacing `ImageData.GetHeroIcon` with `ImageData.GetHeroTexture("npc_dota_hero_pudge")`.
    - [x] Clean up unused `PudgeState` import from Pudge `config.ts` to clear typescript compile warnings.
- [x] Add user-friendly tooltip explanation to Auto Hook (Background) node (2026-06-17)
    - [x] Configure a descriptive tooltip explaining that the script automatically hooks vulnerable, channeled, or stable targets in the background.
- [x] Configure custom logo for Byteseeker root entry (2026-06-17)
    - [x] Create `scripts_files/icons/` subdirectory and copy the custom logo `logo_byteseeker_no_bg60px.png` there to match standard asset layout structure.
    - [x] Implement dynamic `getAssetPath` stack-based directory traversal to find the root folder path at runtime, fixing it to run `fexists` check on the file level instead of the directory level.
    - [x] Convert local absolute paths to the online repository prefix `"github.com/byte-seeker/byteseeker-script-octarine/"` dynamically in `getAssetPath` to ensure asset portability for remote users.
    - [x] Update `Menu.AddEntry("Byteseeker")` to `Menu.AddEntry("Byteseeker", getAssetPath("icons/logo_byteseeker_no_bg60px.png"))` so that it resolves to a valid absolute path regardless of installation folder.


- [x] Fix Hero node icon path (2026-06-17)
    - [x] Replace invalid raw path `"panorama/images/hud/reborn/icon_hero_psd.vtex_c"` with dynamic `ImageData.GetHeroTexture("npc_dota_hero_pudge", true)` which returns the correct small hero texture.
- [x] Add icon image to Counter Items Information & Radius nodes (2026-06-17)
    - [x] Add `ImageData.Icons.icon_analytics` to the Counter Items Information menu node.
    - [x] Add `ImageData.GetItemTexture("item_dragon_lance")` to the Radius menu node.



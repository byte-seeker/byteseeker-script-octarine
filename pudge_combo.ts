import {
	Color,
	Creep,
	dotaunitorder_t,
	EntityManager,
	EventsSDK,
	ExecuteOrder,
	GameState,
	Hero,
	InputManager,
	LocalPlayer,
	Menu,
	RendererSDK,
	TickSleeper,
	Vector2,
	Vector3
} from "github.com/octarine-public/wrapper/index"
import { executeOrbwalk } from "./orbwalker"

interface VelocitySample {
	vx: number
	vy: number
	time: number
}

interface EnemyTracker {
	lastX: number
	lastY: number
	lastZ: number
	lastTime: number
	samples: VelocitySample[]
}

const HOOK_SPEED = 1600
const STABILITY_WINDOW = 0.3 // seconds — observation window before firing hook

new (class PudgeCombo {
	// ── Menu ──────────────────────────────────────────────────────────────
	private readonly entry = Menu.AddEntry("Byteseeker").AddNode("Hero").AddNode("Strength").AddNode("Pudge")
	private readonly comboEnabled = this.entry.AddToggle("Enable Combo", true)
	private readonly comboKey = this.entry.AddKeybind("Combo Key", "G", "Hold to execute combo")
	private readonly comboRadius = this.entry.AddSlider("Target Search Radius", 800, 300, 1500)
	private readonly orbWalkEnabled = this.entry.AddToggle("Enable Smart Orb Walk", true)
	private readonly orbWalkDist = this.entry.AddSlider("Orb Walk Safe Distance %", 80, 10, 100, 5)
	private readonly orbWalkStop = this.entry.AddToggle("Stop-to-Cancel Backswing", false)

	// Hook settings
	private readonly hookNode = this.entry.AddNode("Hook Settings")
	private readonly predBufMs = this.hookNode.AddSlider("Latency Buffer (ms)", 50, 0, 200, 10, "Added on top of physics intercept for server latency")
	private readonly requireStable = this.hookNode.AddToggle("Require Direction Stability", true, "Observe 0.3s enemy movement before firing hook")
	private readonly stableThreshDeg = this.hookNode.AddSlider("Stability Threshold (deg)", 25, 5, 60, 5, "Max direction deviation to consider movement stable")

	// Rot
	private readonly rotEnabled = this.entry.AddToggle("Auto Rot", true)
	private readonly rotMaxRange = this.entry.AddSlider("Rot Max Range", 350, 100, 450, 25)

	// Dismember
	private readonly dismemberNode = this.entry.AddNode("Auto Dismember")
	private readonly dismemberEnabled = this.dismemberNode.AddToggle("Enabled", true)

	// Auto Hook
	private readonly autoHookNode = this.entry.AddNode("Auto Hook (Background)")
	private readonly autoHookEnabled = this.autoHookNode.AddToggle("Enabled", false)
	private readonly autoHookMinDist = this.autoHookNode.AddSlider("Min Distance", 200, 0, 600, 25)

	// Auto Farm
	private readonly farmNode = this.entry.AddNode("Auto Farm (Rot)")
	private readonly farmEnabled = this.farmNode.AddToggle("Enabled", false, "Auto toggle Rot to farm nearby creeps")
	private readonly farmKey = this.farmNode.AddKeybind("Farm Key", "None", "Hold to activate auto farm (overrides toggle)")
	private readonly farmRotRange = this.farmNode.AddSlider("Rot Farm Range", 280, 100, 450, 10, "Distance to nearest creep to activate Rot (Rot AoE ≈ 250 units)")
	private readonly farmMinCreeps = this.farmNode.AddSlider("Min Creeps in Range", 2, 1, 6, 1, "Minimum creeps within Rot AoE before activating")
	private readonly farmSafeHpPct = this.farmNode.AddSlider("Safe HP %", 40, 10, 80, 5, "Turn off Rot if Pudge HP drops below this %")
	private readonly farmMoveToWave = this.farmNode.AddToggle("Move to Nearest Creep", true, "Walk toward nearest creep if none in Rot range")

	// ESP
	private readonly espNode = this.entry.AddNode("ESP")
	private readonly espRangeCircle = this.espNode.AddToggle("Show Hook Range Circle", true)
	private readonly espHookLine = this.espNode.AddToggle("Show Hook Trajectory", true)
	private readonly espRangeLabel = this.espNode.AddToggle("Show Range Labels", true)
	private readonly espApproachSec = this.espNode.AddSlider("Approach Warning (sec)", 2, 1, 5, 1)

	// Combo order
	private comboSequenceGrid: any

	// Sleepers
	private readonly sleeper = new TickSleeper()
	private readonly autoHookSleeper = new TickSleeper()
	private readonly rotSleeper = new TickSleeper()
	private readonly farmSleeper = new TickSleeper()
	private readonly farmMoveSleeper = new TickSleeper()

	// Per-enemy velocity tracking
	private readonly trackerMap = new Map<number, EnemyTracker>()

	constructor() {
		const def = new Map<string, [boolean, boolean, boolean, number]>()
		def.set("pudge_meat_hook", [true, true, true, 0])
		def.set("pudge_rot", [true, true, true, 1])
		def.set("pudge_dismember", [true, true, true, 2])
		this.comboSequenceGrid = this.entry.AddDynamicImageSelector(
			"Combo Order",
			["pudge_meat_hook", "pudge_rot", "pudge_dismember"],
			def
		)
		EventsSDK.on("PostDataUpdate", this.PostDataUpdate.bind(this))
		EventsSDK.on("Draw", this.OnDraw.bind(this))
		EventsSDK.on("GameEnded", this.onGameEnded.bind(this))
	}

	private onGameEnded(): void {
		this.sleeper.Sleep(0)
		this.autoHookSleeper.Sleep(0)
		this.rotSleeper.Sleep(0)
		this.trackerMap.clear()
		this.farmSleeper.Sleep(0)
		this.farmMoveSleeper.Sleep(0)
		this.comboSequenceGrid = null
		this.reinitGrids()
	}

	private reinitGrids(): void {
		const def = new Map<string, [boolean, boolean, boolean, number]>()
		def.set("pudge_meat_hook", [true, true, true, 0])
		def.set("pudge_rot", [true, true, true, 1])
		def.set("pudge_dismember", [true, true, true, 2])
		this.comboSequenceGrid = this.entry.AddDynamicImageSelector(
			"Combo Order",
			["pudge_meat_hook", "pudge_rot", "pudge_dismember"],
			def
		)
	}

	private get hasLocalHero(): boolean {
		return (
			LocalPlayer !== undefined &&
			LocalPlayer.Hero !== undefined &&
			LocalPlayer.Hero.IsValid &&
			LocalPlayer.Hero.Name === "npc_dota_hero_pudge"
		)
	}

	// ── Velocity & Direction Tracking ─────────────────────────────────────

	private updateTracker(enemy: Hero): void {
		const now = GameState.RawGameTime
		const pos = enemy.Position
		const idx = enemy.Index
		const t = this.trackerMap.get(idx)

		if (!t) {
			this.trackerMap.set(idx, { lastX: pos.x, lastY: pos.y, lastZ: pos.z, lastTime: now, samples: [] })
			return
		}
		const dt = now - t.lastTime
		if (dt < 0.016) return

		const vx = (pos.x - t.lastX) / dt
		const vy = (pos.y - t.lastY) / dt
		t.samples.push({ vx, vy, time: now })

		const cutoff = now - 0.5
		t.samples = t.samples.filter(s => s.time >= cutoff)
		t.lastX = pos.x
		t.lastY = pos.y
		t.lastZ = pos.z
		t.lastTime = now
	}

	private getVelocity(idx: number): { vx: number; vy: number } {
		const t = this.trackerMap.get(idx)
		if (!t || t.samples.length === 0) return { vx: 0, vy: 0 }
		const last = t.samples[t.samples.length - 1]
		return { vx: last.vx, vy: last.vy }
	}

	/**
	 * Returns true if enemy direction was stable over last STABILITY_WINDOW seconds.
	 * Prevents firing hook when enemy is mid-rotation.
	 */
	private isDirectionStable(idx: number): boolean {
		const t = this.trackerMap.get(idx)
		if (!t || t.samples.length < 2) return true

		const now = GameState.RawGameTime
		const window = t.samples.filter(s => s.time >= now - STABILITY_WINDOW)
		if (window.length < 2) return true

		const moving = window.filter(s => Math.sqrt(s.vx * s.vx + s.vy * s.vy) > 20)
		if (moving.length < 2) return true // stationary = stable

		const refAngle = Math.atan2(moving[0].vy, moving[0].vx) * (180 / Math.PI)
		const threshold = this.stableThreshDeg.value

		for (let i = 1; i < moving.length; i++) {
			let diff = Math.atan2(moving[i].vy, moving[i].vx) * (180 / Math.PI) - refAngle
			while (diff > 180) diff -= 360
			while (diff < -180) diff += 360
			if (Math.abs(diff) > threshold) return false
		}
		return true
	}

	// ── Quadratic Hook Intercept ──────────────────────────────────────────

	/**
	 * Solves: |targetPos + V*T - pudgePos| = HOOK_SPEED * T
	 * Returns smallest positive T, or null if no solution.
	 */
	private solveIntercept(px: number, py: number, tx: number, ty: number, vx: number, vy: number): number | null {
		const dx = tx - px
		const dy = ty - py
		const a = vx * vx + vy * vy - HOOK_SPEED * HOOK_SPEED
		const b = 2 * (dx * vx + dy * vy)
		const c = dx * dx + dy * dy

		if (Math.abs(a) < 1e-4) {
			if (Math.abs(b) < 1e-4) return null
			const t = -c / b
			return t > 0 ? t : null
		}
		const disc = b * b - 4 * a * c
		if (disc < 0) return null

		const sq = Math.sqrt(disc)
		const t1 = (-b - sq) / (2 * a)
		const t2 = (-b + sq) / (2 * a)

		if (t1 > 0 && t2 > 0) return Math.min(t1, t2)
		if (t1 > 0) return t1
		if (t2 > 0) return t2
		return null
	}

	/**
	 * Computes optimal hook cast position using physics-based intercept.
	 * Clamps result to hook range if out of bounds.
	 */
	private calcCastPos(hero: Hero, target: Hero, hookRange: number): { x: number; y: number; z: number } {
		const hp = hero.Position
		const tp = target.Position
		const vel = this.getVelocity(target.Index)
		const bufSec = (this.predBufMs.value / 1000) + GameState.InputLag

		const t = this.solveIntercept(hp.x, hp.y, tp.x, tp.y, vel.vx, vel.vy)
		let cx: number
		let cy: number

		if (t !== null && t < 5) {
			const totalT = t + bufSec
			cx = tp.x + vel.vx * totalT
			cy = tp.y + vel.vy * totalT
		} else {
			cx = tp.x
			cy = tp.y
		}

		// Clamp to hook range
		const dx = cx - hp.x
		const dy = cy - hp.y
		const dist = Math.sqrt(dx * dx + dy * dy)
		if (dist > hookRange) {
			const ratio = hookRange / dist
			cx = hp.x + dx * ratio
			cy = hp.y + dy * ratio
		}

		return { x: cx, y: cy, z: tp.z }
	}

	/**
	 * Returns seconds until target enters hook range, or null if not approaching / too far.
	 */
	private timeToEnterRange(hero: Hero, target: Hero, hookRange: number): number | null {
		const dist = hero.Distance2D(target)
		if (dist <= hookRange) return 0

		const vel = this.getVelocity(target.Index)
		const dx = target.Position.x - hero.Position.x
		const dy = target.Position.y - hero.Position.y
		const len = Math.sqrt(dx * dx + dy * dy)
		if (len < 1) return null

		const approach = -((vel.vx * dx + vel.vy * dy) / len)
		if (approach <= 0) return null

		const secs = (dist - hookRange) / approach
		return secs <= this.espApproachSec.value ? secs : null
	}

	// ── ESP ───────────────────────────────────────────────────────────────

	private drawDotCircle(cx: number, cy: number, cz: number, r: number, col: Color, segs = 64): void {
		for (let i = 0; i < segs; i++) {
			if (i % 2 !== 0) continue
			const a = (i / segs) * Math.PI * 2
			// @ts-ignore
			const sp = RendererSDK.WorldToScreen(new Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz))
			if (sp !== null) RendererSDK.FilledCircle(sp, new Vector2(3, 3), col)
		}
	}

	private drawLine(a: Vector2, b: Vector2, col: Color): void {
		const dx = b.x - a.x
		const dy = b.y - a.y
		const len = Math.sqrt(dx * dx + dy * dy)
		if (len < 1) return
		const steps = Math.ceil(len / 5)
		for (let i = 0; i <= steps; i++) {
			const f = i / steps
			RendererSDK.FilledCircle(new Vector2(a.x + dx * f, a.y + dy * f), new Vector2(2, 2), col)
		}
	}

	private OnDraw(): void {
		if (!this.hasLocalHero || ExecuteOrder.DisableHumanizer) return
		const hero = LocalPlayer?.Hero
		if (!hero || !hero.IsValid || !hero.IsAlive) return

		const hook = hero.GetAbilityByName("pudge_meat_hook")
		const hookRange = (hook && hook.IsValid && hook.Level > 0 && hook.CastRange > 0) ? hook.CastRange : 1300
		const hookReady = hook !== undefined && hook.IsValid && hook.Level > 0 && hook.Cooldown <= 0.1

		// Range circle around Pudge
		if (this.espRangeCircle.value) {
			const p = hero.Position
			const col = hookReady ? Color.Cyan.SetA(180) : Color.Gray.SetA(100)
			this.drawDotCircle(p.x, p.y, p.z, hookRange, col)
		}

		// Per-enemy labels + hook trajectory
		for (const en of EntityManager.GetEntitiesByClass(Hero)) {
			if (!en.IsValid || !en.IsAlive || !en.IsVisible || !en.IsEnemy(hero) || en.IsIllusion) continue

			// @ts-ignore
			const sp = RendererSDK.WorldToScreen(en.Position) as Vector2 | null
			if (sp === null) continue

			const dist = hero.Distance2D(en)
			const inRange = dist <= hookRange
			const stable = this.isDirectionStable(en.Index)

			// Range status label
			if (this.espRangeLabel.value) {
				const tte = inRange ? 0 : this.timeToEnterRange(hero, en, hookRange)
				let label: string
				let col: Color

				if (inRange && hookReady) {
					label = stable ? "[ HOOK READY ]" : "[ HOOK READY — ROTATING ]"
					col = stable ? Color.Green : Color.Red
				} else if (inRange) {
					label = stable ? "[ IN RANGE ]" : "[ IN RANGE — ROTATING ]"
					col = stable ? Color.Yellow : Color.Red
				} else if (tte !== null) {
					label = `[ ENTERING ${tte.toFixed(1)}s ]`
					col = Color.Yellow
				} else {
					label = `[ ${Math.round(dist)}u / ${hookRange}u ]`
					col = Color.White.SetA(150)
				}

				const font = "PTSans"
				const sz = RendererSDK.GetTextSize(label, font, 11, 700, false)
				const tp = new Vector2(sp.x - sz.x / 2, sp.y - 42)
				RendererSDK.FilledRect(new Vector2(tp.x - 4, tp.y - 2), new Vector2(sz.x + 8, sz.y + 4), Color.Black.SetA(160))
				RendererSDK.Text(label, tp, col, font, 11, 700, false, true)
			}

			// Hook trajectory line while combo key held
			// @ts-ignore
			if (this.espHookLine.value && this.comboKey.isPressed && inRange) {
				const cast = this.calcCastPos(hero, en, hookRange)
				// @ts-ignore
				const hs = RendererSDK.WorldToScreen(hero.Position) as Vector2 | null
				// @ts-ignore
				const cs = RendererSDK.WorldToScreen(new Vector3(cast.x, cast.y, cast.z)) as Vector2 | null
				if (hs !== null && cs !== null) {
					const col = stable ? Color.Cyan.SetA(220) : Color.Red.SetA(220)
					this.drawLine(hs, cs, col)
					RendererSDK.FilledCircle(cs, new Vector2(7, 7), col)
				}
			}
		}
	}

	// ── Spell Execution ───────────────────────────────────────────────────

	private isVulnerable(target: Hero): boolean {
		return (
			target.IsStunned ||
			target.IsHexed ||
			target.Buffs.some(b => b.Name === "modifier_pudge_meat_hook")
		)
	}

	private castHook(hero: Hero, target: Hero): boolean {
		const hook = hero.GetAbilityByName("pudge_meat_hook")
		if (!hook || !hook.IsValid || hook.Level <= 0 || hook.Cooldown > 0.1 || hero.Mana < hook.ManaCost) return false
		if (target.IsMagicImmune || target.IsDebuffImmune) return false

		const hookRange = hook.CastRange > 0 ? hook.CastRange : 1300
		if (hero.Distance2D(target) > hookRange) return false

		// Skip if vulnerable and dismember enabled — dismember takes priority
		if (this.isVulnerable(target) && this.dismemberEnabled.value) return false

		// ── 0.3s direction stability check ──
		if (this.requireStable.value && !this.isDirectionStable(target.Index)) return false

		const pos = this.calcCastPos(hero, target, hookRange)
		ExecuteOrder.PrepareOrder({
			orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_POSITION,
			issuers: [hero], position: pos, ability: hook.Index,
			queue: false, showEffects: true, isPlayerInput: false
		})
		this.sleeper.Sleep(GameState.InputLag * 1000 + hook.CastPoint * 1000 + 150)
		return true
	}

	private castRot(hero: Hero, target: Hero | undefined): boolean {
		if (!this.rotEnabled.value || this.rotSleeper.Sleeping) return false
		const rot = hero.GetAbilityByName("pudge_rot")
		if (!rot || !rot.IsValid || rot.Level <= 0) return false

		const active = hero.Buffs.some(b => b.Name === "modifier_pudge_rot")
		const shouldOn = target !== undefined && hero.Distance2D(target) <= this.rotMaxRange.value && !target.IsMagicImmune

		if (shouldOn !== active) {
			ExecuteOrder.PrepareOrder({
				orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_NO_TARGET,
				issuers: [hero], ability: rot.Index,
				queue: false, showEffects: shouldOn, isPlayerInput: false
			})
			this.rotSleeper.Sleep(GameState.InputLag * 1000 + rot.CastPoint * 1000 + 100)
			return shouldOn
		}
		return false
	}

	private castDismember(hero: Hero, target: Hero): boolean {
		const dis = hero.GetAbilityByName("pudge_dismember")
		if (!dis || !dis.IsValid || dis.Level <= 0 || dis.Cooldown > 0.1 || hero.Mana < dis.ManaCost) return false
		if (target.IsMagicImmune) return false

		const range = dis.CastRange > 0 ? dis.CastRange : 150
		if (hero.Distance2D(target) > range) return false

		ExecuteOrder.PrepareOrder({
			orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_TARGET,
			issuers: [hero], target: target.Index, ability: dis.Index,
			queue: false, showEffects: true, isPlayerInput: false
		})
		this.sleeper.Sleep(GameState.InputLag * 1000 + dis.CastPoint * 1000 + 200)
		return true
	}

	// ── Auto Farm ─────────────────────────────────────────────────────────

	/**
	 * Auto Farm menggunakan Rot:
	 * - Aktifkan Rot jika ada >= N creep musuh dalam jangkauan
	 * - Matikan Rot jika HP Pudge < threshold atau tidak ada creep
	 * - Opsional: jalan ke arah creep wave terdekat
	 */
	private runAutoFarm(hero: Hero): void {
		// @ts-ignore
		const farmActive = this.farmEnabled.value || this.farmKey.isPressed
		if (!farmActive) return

		// Jangan farm saat combo key ditekan
		// @ts-ignore
		if (this.comboKey.isPressed) return

		if (hero.IsChanneling || hero.IsStunned || hero.IsSilenced || hero.IsHexed) return

		const rot = hero.GetAbilityByName("pudge_rot")
		if (!rot || !rot.IsValid || rot.Level <= 0) return

		const isRotActive = hero.Buffs.some(b => b.Name === "modifier_pudge_rot")
		const hpPct = (hero.HP / hero.MaxHP) * 100

		// Safety: matikan Rot jika HP di bawah threshold
		if (isRotActive && hpPct <= this.farmSafeHpPct.value) {
			if (!this.farmSleeper.Sleeping) {
				ExecuteOrder.PrepareOrder({
					orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_NO_TARGET,
					issuers: [hero], ability: rot.Index,
					queue: false, showEffects: false, isPlayerInput: false
				})
				this.farmSleeper.Sleep(GameState.InputLag * 1000 + 300)
			}
			return
		}

		const rotAoe = this.farmRotRange.value
		let creepsInRange = 0
		let nearestCreep: Creep | undefined
		let nearestCreepDist = Infinity

		// Hitung creep musuh dalam jangkauan Rot
		for (const creep of EntityManager.GetEntitiesByClass(Creep)) {
			if (!creep.IsValid || !creep.IsAlive || !creep.IsVisible || !creep.IsEnemy(hero)) continue
			const d = hero.Distance2D(creep)
			if (d <= rotAoe) {
				creepsInRange++
			}
			if (d < nearestCreepDist) {
				nearestCreepDist = d
				nearestCreep = creep
			}
		}

		const shouldRotOn = creepsInRange >= this.farmMinCreeps.value && hpPct > this.farmSafeHpPct.value

		// Toggle Rot ON/OFF sesuai kondisi
		if (shouldRotOn !== isRotActive && !this.farmSleeper.Sleeping) {
			ExecuteOrder.PrepareOrder({
				orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_NO_TARGET,
				issuers: [hero], ability: rot.Index,
				queue: false, showEffects: shouldRotOn, isPlayerInput: false
			})
			this.farmSleeper.Sleep(GameState.InputLag * 1000 + rot.CastPoint * 1000 + 150)
		}

		// Move toward nearest creep jika tidak ada creep dalam range dan fitur aktif
		if (
			this.farmMoveToWave.value &&
			!shouldRotOn &&
			!isRotActive &&
			nearestCreep !== undefined &&
			!this.farmMoveSleeper.Sleeping
		) {
			ExecuteOrder.PrepareOrder({
				orderType: dotaunitorder_t.DOTA_UNIT_ORDER_MOVE_TO_TARGET,
				issuers: [hero],
				target: nearestCreep.Index,
				queue: false, showEffects: false, isPlayerInput: false
			})
			this.farmMoveSleeper.Sleep(GameState.InputLag * 1000 + 500)
		}
	}

	private runAutoHook(hero: Hero): void {
		if (!this.autoHookEnabled.value || this.autoHookSleeper.Sleeping) return
		if (hero.IsChanneling || hero.IsStunned || hero.IsSilenced || hero.IsHexed) return

		const hook = hero.GetAbilityByName("pudge_meat_hook")
		if (!hook || !hook.IsValid || hook.Level <= 0 || hook.Cooldown > 0.1 || hero.Mana < hook.ManaCost) return

		const hookRange = hook.CastRange > 0 ? hook.CastRange : 1300
		let best: Hero | undefined
		let bestDist = Infinity

		for (const en of EntityManager.GetEntitiesByClass(Hero)) {
			if (!en.IsValid || !en.IsAlive || !en.IsVisible || !en.IsEnemy(hero) || en.IsIllusion || en.IsMagicImmune || en.IsDebuffImmune) continue
			const d = hero.Distance2D(en)
			if (d >= this.autoHookMinDist.value && d <= hookRange && d < bestDist) {
				bestDist = d
				best = en
			}
		}
		if (!best) return

		// Skip if dismember in range
		const dis = hero.GetAbilityByName("pudge_dismember")
		if (dis && dis.Level > 0 && dis.Cooldown <= 0.1 && hero.Distance2D(best) <= (dis.CastRange > 0 ? dis.CastRange : 150)) return

		if (this.requireStable.value && !this.isDirectionStable(best.Index)) return

		const pos = this.calcCastPos(hero, best, hookRange)
		ExecuteOrder.PrepareOrder({
			orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_POSITION,
			issuers: [hero], position: pos, ability: hook.Index,
			queue: false, showEffects: true, isPlayerInput: false
		})
		this.autoHookSleeper.Sleep(GameState.InputLag * 1000 + hook.CastPoint * 1000 + 300)
	}

	// ── Main Loop ─────────────────────────────────────────────────────────

	private PostDataUpdate(delta: number): void {
		if (delta === 0 || !this.hasLocalHero || ExecuteOrder.DisableHumanizer) return
		const hero = LocalPlayer?.Hero
		if (!hero || !hero.IsValid || !hero.IsAlive || !this.comboEnabled.value || !this.comboSequenceGrid) return

		// Update velocity tracker for all visible enemies every frame
		for (const en of EntityManager.GetEntitiesByClass(Hero)) {
			if (en.IsValid && en.IsAlive && en.IsVisible && en.IsEnemy(hero) && !en.IsIllusion) {
				this.updateTracker(en)
			}
		}

		this.runAutoFarm(hero)
		this.runAutoHook(hero)

		// @ts-ignore
		if (!this.comboKey.isPressed) {
			this.castRot(hero, undefined)
			return
		}

		if (hero.IsChanneling || hero.IsStunned || hero.IsSilenced || hero.IsHexed) return

		// Find nearest enemy to cursor within radius
		const mousePos = InputManager.CursorOnWorld
		let best: Hero | undefined
		let bestDist = Infinity

		for (const en of EntityManager.GetEntitiesByClass(Hero)) {
			if (!en.IsValid || !en.IsAlive || !en.IsVisible || !en.IsEnemy(hero) || en.IsIllusion) continue
			const dc = en.Position.Distance2D(mousePos)
			const dh = hero.Distance2D(en)
			if (dc < this.comboRadius.value && dh <= 1400 && dc < bestDist) {
				bestDist = dc
				best = en
			}
		}

		// Handle rot independently
		if (!this.rotSleeper.Sleeping) this.castRot(hero, best)

		if (!best || this.sleeper.Sleeping) return

		// Priority: dismember when target is already vulnerable (hooked/stunned)
		if (this.isVulnerable(best) && this.comboSequenceGrid.IsEnabled("pudge_dismember")) {
			if (this.castDismember(hero, best)) return
		}

		// Execute combo in sequence order
		for (const name of this.comboSequenceGrid.values) {
			if (!this.comboSequenceGrid.IsEnabled(name)) continue
			if (name === "pudge_meat_hook" && this.castHook(hero, best)) return
			if (name === "pudge_rot") continue // handled separately
			if (name === "pudge_dismember" && this.castDismember(hero, best)) return
		}

		// Fallback: orb walk
		executeOrbwalk(hero, best, this.sleeper, {
			enabled: this.orbWalkEnabled.value,
			safeDistancePct: this.orbWalkDist.value,
			stopToCancel: this.orbWalkStop.value
		})
	}
})()

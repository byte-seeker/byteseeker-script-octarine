import {
	Color,
	EntityManager,
	ExecuteOrder,
	Hero,
	LocalPlayer,
	RendererSDK,
	Vector2,
	Vector3
} from "github.com/octarine-public/wrapper/index"

import { PudgeConfig } from "./config"
import { calcCastPos, getHookBlocker, isDirectionStable, timeToEnterRange } from "./tracker"

function drawWorldCircle(
	cx: number,
	cy: number,
	cz: number,
	r: number,
	col: Color,
	thickness = 2,
	segs = 32,
	dashed = false
): void {
	let lastPos: Vector2 | null = null
	for (let i = 0; i <= segs; i++) {
		if (dashed && i % 2 !== 0) {
			lastPos = null
			continue
		}
		const a = (i / segs) * Math.PI * 2
		const wp = new Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz)
		// @ts-ignore
		const sp = RendererSDK.WorldToScreen(wp) as Vector2 | null
		if (sp !== null && sp !== undefined) {
			if (lastPos !== null) {
				RendererSDK.Line(lastPos, sp, col, thickness)
			}
			lastPos = sp
		} else {
			lastPos = null
		}
	}
}

function drawDashedLine(a: Vector2, b: Vector2, col: Color, dashLen = 8, gapLen = 6, thickness = 2): void {
	const dx = b.x - a.x
	const dy = b.y - a.y
	const len = Math.sqrt(dx * dx + dy * dy)
	if (len < 1) {
		return
	}
	const step = dashLen + gapLen
	const numDashes = Math.ceil(len / step)

	for (let i = 0; i < numDashes; i++) {
		const startPct = (i * step) / len
		const endPct = Math.min(1, (i * step + dashLen) / len)

		const p1 = new Vector2(a.x + dx * startPct, a.y + dy * startPct)
		const p2 = new Vector2(a.x + dx * endPct, a.y + dy * endPct)
		RendererSDK.Line(p1, p2, col, thickness)
	}
}

export function drawEsp(): void {
	const hasLocalHero =
		LocalPlayer !== undefined &&
		LocalPlayer.Hero !== undefined &&
		LocalPlayer.Hero.IsValid &&
		LocalPlayer.Hero.Name === "npc_dota_hero_pudge"

	if (!hasLocalHero || ExecuteOrder.DisableHumanizer) {
		return
	}
	const hero = LocalPlayer?.Hero
	if (!hero || !hero.IsValid || !hero.IsAlive) {
		return
	}

	const hook = hero.GetAbilityByName("pudge_meat_hook")
	const hookRange = hook && hook.IsValid && hook.Level > 0 && hook.CastRange > 0 ? hook.CastRange : 1300
	const hookReady = hook !== undefined && hook.IsValid && hook.Level > 0 && hook.Cooldown <= 0.1

	if (PudgeConfig.espRangeCircle.value) {
		const p = hero.Position
		const col = hookReady ? Color.Aqua.SetA(180) : Color.Gray.SetA(100)
		drawWorldCircle(p.x, p.y, p.z, hookRange, col, 2, 64, true)
	}

	for (const en of EntityManager.GetEntitiesByClass(Hero)) {
		if (!en.IsValid || !en.IsAlive || !en.IsVisible || !en.IsEnemy(hero) || en.IsIllusion) {
			continue
		}

		// @ts-ignore
		const sp = RendererSDK.WorldToScreen(en.Position) as Vector2 | null
		if (sp === null) {
			continue
		}

		const dist = hero.Distance2D(en)
		const inRange = dist <= hookRange
		const stable = isDirectionStable(en.Index)

		if (PudgeConfig.espRangeLabel.value) {
			const tte = inRange ? 0 : timeToEnterRange(hero, en, hookRange)
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
			RendererSDK.FilledRect(
				new Vector2(tp.x - 4, tp.y - 2),
				new Vector2(sz.x + 8, sz.y + 4),
				Color.Black.SetA(160)
			)
			RendererSDK.Text(label, tp, col, font, 11, 700, false, true)
		}

		if (PudgeConfig.espHookLine.value && inRange) {
			const cast = calcCastPos(hero, en, hookRange)
			// @ts-ignore
			const hs = RendererSDK.WorldToScreen(hero.Position) as Vector2 | null
			// @ts-ignore
			const cs = RendererSDK.WorldToScreen(new Vector3(cast.x, cast.y, cast.z)) as Vector2 | null
			if (hs !== null && cs !== null) {
				const blocker =
					hook && PudgeConfig.espShowBlockers.value ? getHookBlocker(hero, en, cast, hook) : undefined

				let col: Color
				if (blocker) {
					col = new Color(255, 50, 50, 220) // Crimson Red for blocked
				} else if (!stable) {
					col = new Color(255, 140, 0, 220) // Orange for unstable target direction
				} else {
					col = new Color(57, 255, 20, 220) // Neon Green for perfect opportunity
				}

				drawDashedLine(hs, cs, col, 8, 6, 2)

				// Draw 3D world circle at the predicted landing point representing hook's actual collision radius
				const hookRadius = hook ? hook.GetBaseAOERadiusForLevel(hook.Level) : 100
				drawWorldCircle(cast.x, cast.y, cast.z, hookRadius, col, 2, 32, false)

				if (blocker) {
					// @ts-ignore
					const blockerPos = RendererSDK.WorldToScreen(blocker.Position) as Vector2 | null
					if (blockerPos !== null && blockerPos !== undefined) {
						// Draw 3D world circle around the blocker using its real HullRadius
						const blockerRadius = blocker.HullRadius || 30
						drawWorldCircle(
							blocker.Position.x,
							blocker.Position.y,
							blocker.Position.z,
							blockerRadius,
							new Color(255, 50, 50, 225),
							2,
							32,
							false
						)

						const font = "PTSans"
						const label = "BLOCKER"
						const labelSize = RendererSDK.GetTextSize(label, font, 9, 600, false)
						const labelPos = new Vector2(blockerPos.x - labelSize.x / 2, blockerPos.y - 30)

						RendererSDK.FilledRect(
							new Vector2(labelPos.x - 3, labelPos.y - 1),
							new Vector2(labelSize.x + 6, labelSize.y + 2),
							Color.Black.SetA(160)
						)
						RendererSDK.Text(label, labelPos, Color.Red, font, 9, 600, false, true)
					}
				}
			}
		}
	}
}

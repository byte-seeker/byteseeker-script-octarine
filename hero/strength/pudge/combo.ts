import { EntityManager, Hero, InputManager } from "github.com/octarine-public/wrapper/index"

import { executeOrbwalk } from "../../../orbwalker"
import { castDismember, castHook, castRot, isVulnerable } from "./abilities"
import { PudgeConfig } from "./config"
import { PudgeState } from "./state"

export function runCombo(hero: Hero): void {
	// @ts-ignore
	if (!PudgeConfig.comboKey.isPressed) {
		castRot(hero, undefined)
		return
	}

	if (hero.IsChanneling || hero.IsStunned || hero.IsSilenced || hero.IsHexed) {
		return
	}

	const mousePos = InputManager.CursorOnWorld
	let best: Hero | undefined
	let bestDist = Infinity

	for (const en of EntityManager.GetEntitiesByClass(Hero)) {
		if (!en.IsValid || !en.IsAlive || !en.IsVisible || !en.IsEnemy(hero) || en.IsIllusion) {
			continue
		}
		const dc = en.Position.Distance2D(mousePos)
		const dh = hero.Distance2D(en)
		if (dc < PudgeConfig.comboRadius.value && dh <= 1400 && dc < bestDist) {
			bestDist = dc
			best = en
		}
	}

	if (!PudgeState.rotSleeper.Sleeping) {
		castRot(hero, best)
	}

	if (!best || PudgeState.sleeper.Sleeping) {
		return
	}

	if (isVulnerable(best) && PudgeConfig.comboSequenceGrid.IsEnabled("pudge_dismember")) {
		if (castDismember(hero, best)) {
			return
		}
	}

	for (const name of PudgeConfig.comboSequenceGrid.values) {
		if (!PudgeConfig.comboSequenceGrid.IsEnabled(name)) {
			continue
		}
		if (name === "pudge_meat_hook" && castHook(hero, best)) {
			return
		}
		if (name === "pudge_rot") {
			continue
		}
		if (name === "pudge_dismember" && castDismember(hero, best)) {
			return
		}
	}

	executeOrbwalk(hero, best, PudgeState.sleeper, {
		enabled: PudgeConfig.orbWalkEnabled.value,
		safeDistancePct: PudgeConfig.orbWalkDist.value,
		stopToCancel: PudgeConfig.orbWalkStop.value
	})
}

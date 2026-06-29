import { dotaunitorder_t, ExecuteOrder, GameState, Hero } from "github.com/octarine-public/wrapper/index"

import { DrowRangerConfig } from "./config"
import { DrowRangerState } from "./state"

export function runAutoFrostArrows(hero: Hero): void {
	if (!DrowRangerConfig.autoFrostArrowsEnabled.value || DrowRangerState.sleeper.Sleeping) {
		return
	}

	const frostArrows = hero.GetAbilityByName("drow_ranger_frost_arrows")
	if (!frostArrows || !frostArrows.IsValid || frostArrows.Level <= 0) {
		return
	}

	// @ts-ignore - AutoCast is a known property on ability objects
	const isAutoCastEnabled = frostArrows.AutoCast

	const target = hero.Target

	let shouldBeAutoCasting = false

	if (target !== undefined && target.IsValid && target.IsAlive) {
		if (target instanceof Hero && target.IsEnemy(hero) && !target.IsIllusion && target.IsVisible) {
			// Don't auto-cast if target is magic immune
			if (!target.IsMagicImmune) {
				shouldBeAutoCasting = true
			}
		}
	}

	if (shouldBeAutoCasting && !isAutoCastEnabled) {
		ExecuteOrder.PrepareOrder({
			orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_TOGGLE_AUTO,
			issuers: [hero],
			ability: frostArrows.Index,
			queue: false,
			showEffects: false,
			isPlayerInput: false
		})
		DrowRangerState.sleeper.Sleep(GameState.InputLag * 1000 + 150)
	} else if (!shouldBeAutoCasting && isAutoCastEnabled) {
		ExecuteOrder.PrepareOrder({
			orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_TOGGLE_AUTO,
			issuers: [hero],
			ability: frostArrows.Index,
			queue: false,
			showEffects: false,
			isPlayerInput: false
		})
		DrowRangerState.sleeper.Sleep(GameState.InputLag * 1000 + 150)
	}
}

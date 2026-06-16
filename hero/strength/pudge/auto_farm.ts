import {
	Creep,
	dotaunitorder_t,
	EntityManager,
	ExecuteOrder,
	GameState,
	Hero,
	pudge_rot
} from "github.com/octarine-public/wrapper/index"

import { PudgeConfig } from "./config"
import { PudgeState } from "./state"

export function runAutoFarm(hero: Hero): void {
	const farmActive = PudgeConfig.farmEnabled.value
	if (!farmActive) {
		return
	}

	// @ts-ignore
	if (PudgeConfig.comboKey.isPressed) {
		return
	}

	if (hero.IsChanneling || hero.IsStunned || hero.IsSilenced || hero.IsHexed) {
		return
	}

	const rot = hero.GetAbilityByName("pudge_rot")
	if (!rot || !rot.IsValid || rot.Level <= 0) {
		return
	}

	const isRotActive = hero.Buffs.some((b: any) => b.Name === "modifier_pudge_rot")
	const hpPct = (hero.HP / hero.MaxHP) * 100

	if (isRotActive && hpPct <= PudgeConfig.farmSafeHpPct.value) {
		if (!PudgeState.farmSleeper.Sleeping) {
			ExecuteOrder.PrepareOrder({
				orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_TOGGLE,
				issuers: [hero],
				ability: rot.Index,
				queue: false,
				showEffects: false,
				isPlayerInput: false
			})
			PudgeState.farmSleeper.Sleep(GameState.InputLag * 1000 + 300)
		}
		return
	}

	if (!isRotActive && PudgeState.wasRotTurnedOnByFarm && !PudgeState.farmSleeper.Sleeping) {
		PudgeState.wasRotTurnedOnByFarm = false
	}

	const rotAoe = (rot as pudge_rot).GetBaseAOERadiusForLevel(rot.Level)
	let creepsInRange = 0
	let lowHpCreeps = 0

	for (const creep of EntityManager.GetEntitiesByClass(Creep)) {
		if (!creep.IsValid || !creep.IsAlive || !creep.IsVisible || !creep.IsEnemy(hero)) {
			continue
		}
		const d = hero.Distance2D(creep)
		if (d <= rotAoe) {
			creepsInRange++
			const creepHpPct = (creep.HP / creep.MaxHP) * 100
			if (creepHpPct <= PudgeConfig.farmCreepHpPct.value) {
				lowHpCreeps++
			}
		}
	}

	if (!isRotActive) {
		if (lowHpCreeps > 0 && !PudgeState.farmSleeper.Sleeping && hpPct > PudgeConfig.farmSafeHpPct.value) {
			ExecuteOrder.PrepareOrder({
				orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_TOGGLE,
				issuers: [hero],
				ability: rot.Index,
				queue: false,
				showEffects: true,
				isPlayerInput: false
			})
			PudgeState.farmSleeper.Sleep(GameState.InputLag * 1000 + rot.CastPoint * 1000 + 300)
			PudgeState.wasRotTurnedOnByFarm = true
		}
	} else if (PudgeState.wasRotTurnedOnByFarm && !PudgeState.farmSleeper.Sleeping) {
		if (creepsInRange === 0 || hpPct <= PudgeConfig.farmSafeHpPct.value) {
			ExecuteOrder.PrepareOrder({
				orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_TOGGLE,
				issuers: [hero],
				ability: rot.Index,
				queue: false,
				showEffects: false,
				isPlayerInput: false
			})
			PudgeState.farmSleeper.Sleep(GameState.InputLag * 1000 + 300)
			PudgeState.wasRotTurnedOnByFarm = false
		}
	}
}

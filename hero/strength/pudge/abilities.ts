import { dotaunitorder_t, ExecuteOrder, GameState, Hero, pudge_rot } from "github.com/octarine-public/wrapper/index"

import { PudgeConfig } from "./config"
import { PudgeState } from "./state"
import { calcCastPos, isDirectionStable, isHookBlocked } from "./tracker"

export function isVulnerable(target: Hero): boolean {
	return target.IsStunned || target.IsHexed || target.Buffs.some((b: any) => b.Name === "modifier_pudge_meat_hook")
}

export function castHook(hero: Hero, target: Hero): boolean {
	const hook = hero.GetAbilityByName("pudge_meat_hook")
	if (!hook || !hook.IsValid || hook.Level <= 0 || hook.Cooldown > 0.1 || hero.Mana < hook.ManaCost) {
		return false
	}
	if (target.IsMagicImmune || target.IsDebuffImmune) {
		return false
	}

	const hookRange = hook.CastRange > 0 ? hook.CastRange : 1300
	if (hero.Distance2D(target) > hookRange) {
		return false
	}

	if (isVulnerable(target) && PudgeConfig.dismemberEnabled.value) {
		return false
	}

	if (PudgeConfig.requireStable.value && !isDirectionStable(target.Index)) {
		return false
	}

	const pos = calcCastPos(hero, target, hookRange)
	if (PudgeConfig.collisionCheck.value && isHookBlocked(hero, target, pos, PudgeConfig.hookCollisionRadius.value)) {
		return false
	}

	ExecuteOrder.PrepareOrder({
		orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_POSITION,
		issuers: [hero],
		position: pos,
		ability: hook.Index,
		queue: false,
		showEffects: true,
		isPlayerInput: false
	})
	PudgeState.sleeper.Sleep(GameState.InputLag * 1000 + hook.CastPoint * 1000 + 150)
	return true
}

export function castRot(hero: Hero, target: Hero | undefined): boolean {
	if (!PudgeConfig.rotEnabled.value || PudgeState.rotSleeper.Sleeping) {
		return false
	}
	const rot = hero.GetAbilityByName("pudge_rot")
	if (!rot || !rot.IsValid || rot.Level <= 0) {
		return false
	}

	const active = hero.Buffs.some((b: any) => b.Name === "modifier_pudge_rot")

	if (!active && PudgeState.wasRotTurnedOnByCombo) {
		PudgeState.wasRotTurnedOnByCombo = false
	}

	const shouldOn =
		target !== undefined &&
		hero.Distance2D(target) <= (rot as pudge_rot).GetBaseAOERadiusForLevel(rot.Level) &&
		!target.IsMagicImmune

	if (shouldOn && !active) {
		ExecuteOrder.PrepareOrder({
			orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_TOGGLE,
			issuers: [hero],
			ability: rot.Index,
			queue: false,
			showEffects: true,
			isPlayerInput: false
		})
		PudgeState.rotSleeper.Sleep(GameState.InputLag * 1000 + 150)
		PudgeState.wasRotTurnedOnByCombo = true
		return true
	} else if (!shouldOn && active && PudgeState.wasRotTurnedOnByCombo) {
		ExecuteOrder.PrepareOrder({
			orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_TOGGLE,
			issuers: [hero],
			ability: rot.Index,
			queue: false,
			showEffects: false,
			isPlayerInput: false
		})
		PudgeState.rotSleeper.Sleep(GameState.InputLag * 1000 + 150)
		PudgeState.wasRotTurnedOnByCombo = false
		return true
	}
	return false
}

export function castDismember(hero: Hero, target: Hero): boolean {
	const dis = hero.GetAbilityByName("pudge_dismember")
	if (!dis || !dis.IsValid || dis.Level <= 0 || dis.Cooldown > 0.1 || hero.Mana < dis.ManaCost) {
		return false
	}
	if (target.IsMagicImmune) {
		return false
	}

	const range = dis.CastRange > 0 ? dis.CastRange : 150
	if (hero.Distance2D(target) > range) {
		return false
	}

	ExecuteOrder.PrepareOrder({
		orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_TARGET,
		issuers: [hero],
		target: target.Index,
		ability: dis.Index,
		queue: false,
		showEffects: true,
		isPlayerInput: false
	})
	PudgeState.sleeper.Sleep(GameState.InputLag * 1000 + dis.CastPoint * 1000 + 200)
	return true
}

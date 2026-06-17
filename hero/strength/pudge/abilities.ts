import {
	dotaunitorder_t,
	EntityManager,
	ExecuteOrder,
	GameState,
	Hero,
	ProjectileManager,
	pudge_rot
} from "github.com/octarine-public/wrapper/index"

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

	const isBeingHooked = target.Buffs.some((b: any) => b.Name === "modifier_pudge_meat_hook")
	if (isBeingHooked) {
		return false
	}

	const dismember = hero.GetAbilityByName("pudge_dismember")
	const hasDismember =
		dismember !== undefined &&
		dismember.IsValid &&
		dismember.Level > 0 &&
		dismember.Cooldown <= 0.1 &&
		hero.Mana >= dismember.ManaCost
	const dismemberRange = dismember && dismember.CastRange > 0 ? dismember.CastRange : 150
	if (
		isVulnerable(target) &&
		PudgeConfig.dismemberEnabled.value &&
		hasDismember &&
		hero.Distance2D(target) <= dismemberRange
	) {
		return false
	}

	if (PudgeConfig.requireStable.value && !isDirectionStable(target.Index)) {
		return false
	}

	const pos = calcCastPos(hero, target, hookRange)
	if (PudgeConfig.collisionCheck.value && isHookBlocked(hero, target, pos, hook)) {
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
	PudgeState.lastHookTargetIndex = target.Index
	PudgeState.lastHookCastPos = pos
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

export function cancelHook(hero: Hero): void {
	ExecuteOrder.PrepareOrder({
		orderType: dotaunitorder_t.DOTA_UNIT_ORDER_STOP,
		issuers: [hero],
		queue: false,
		showEffects: false,
		isPlayerInput: false
	})
	PudgeState.sleeper.Sleep(800)
	PudgeState.autoKsSleeper.Sleep(800)
	PudgeState.autoHookSleeper.Sleep(800)
	PudgeState.lastHookTargetIndex = undefined
	PudgeState.lastHookCastPos = undefined
}

export function runHookCancel(hero: Hero): void {
	if (!PudgeConfig.cancelEnabled.value) {
		return
	}
	const hook = hero.GetAbilityByName("pudge_meat_hook")
	if (!hook || !hook.IsValid || hook.Level <= 0) {
		return
	}

	if (!hook.IsInAbilityPhase) {
		PudgeState.lastHookTargetIndex = undefined
		PudgeState.lastHookCastPos = undefined
		return
	}

	const targetIndex = PudgeState.lastHookTargetIndex
	if (targetIndex === undefined) {
		return
	}

	const target = EntityManager.EntityByIndex(targetIndex)
	if (!target || !(target instanceof Hero) || !target.IsValid || !target.IsAlive) {
		cancelHook(hero)
		return
	}

	if (PudgeConfig.cancelOnImmune.value && (target.IsMagicImmune || target.IsDebuffImmune)) {
		cancelHook(hero)
		return
	}

	if (PudgeConfig.cancelOnInvisible.value && !target.IsVisible) {
		cancelHook(hero)
		return
	}

	if (PudgeConfig.cancelOnEul.value) {
		const isCycloned = target.Buffs.some(
			(b: any) =>
				b.Name === "modifier_eul_cyclone" ||
				b.Name === "modifier_wind_waker" ||
				b.Name === "modifier_brewmaster_storm_cyclone"
		)
		if (isCycloned) {
			cancelHook(hero)
			return
		}
	}

	if (PudgeConfig.cancelOnBlink.value) {
		const hookRange = hook.CastRange > 0 ? hook.CastRange : 1300
		const newCastPos = calcCastPos(hero, target, hookRange)
		if (PudgeState.lastHookCastPos && newCastPos.Distance2D(PudgeState.lastHookCastPos) > 300) {
			cancelHook(hero)
			return
		}
	}

	if (
		PudgeConfig.collisionCheck.value &&
		PudgeState.lastHookCastPos &&
		isHookBlocked(hero, target, PudgeState.lastHookCastPos, hook)
	) {
		cancelHook(hero)
	}
}

export function runAutoMeatShield(hero: Hero): void {
	const currentHp = hero.HP
	const lastHp = PudgeState.lastMeatShieldHp !== undefined ? PudgeState.lastMeatShieldHp : currentHp
	PudgeState.lastMeatShieldHp = currentHp

	if (!PudgeConfig.meatShieldEnabled.value || PudgeState.meatShieldSleeper.Sleeping) {
		return
	}
	if (hero.IsChanneling || hero.IsStunned || hero.IsSilenced || hero.IsHexed || hero.IsInvisible) {
		return
	}

	const fleshHeap = hero.GetAbilityByName("pudge_flesh_heap")
	if (
		!fleshHeap ||
		!fleshHeap.IsValid ||
		fleshHeap.Level <= 0 ||
		!fleshHeap.IsCooldownReady ||
		hero.Mana < fleshHeap.ManaCost
	) {
		return
	}

	const hasShieldActive = hero.Buffs.some((b: any) => b.Name === "modifier_pudge_flesh_heap_block")
	if (hasShieldActive) {
		return
	}

	let shouldActivate = false

	// 1. Check incoming projectiles
	if (PudgeConfig.meatShieldOnProjectile.value) {
		const incoming = ProjectileManager.AllTrackingProjectiles.some(
			proj => proj.Target === hero && !proj.IsDodged && (proj.IsAttack ? proj.Source instanceof Hero : true)
		)
		if (incoming) {
			shouldActivate = true
		}
	}

	// 2. Check HP drop
	if (!shouldActivate && PudgeConfig.meatShieldOnHpDrop.value) {
		const hpDrop = lastHp - currentHp
		if (hpDrop >= PudgeConfig.meatShieldHpThreshold.value) {
			shouldActivate = true
		}
	}

	if (shouldActivate) {
		ExecuteOrder.PrepareOrder({
			orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_NO_TARGET,
			issuers: [hero],
			ability: fleshHeap.Index,
			queue: false,
			showEffects: true,
			isPlayerInput: false
		})
		PudgeState.meatShieldSleeper.Sleep(GameState.InputLag * 1000 + 200)
	}
}

import { dotaunitorder_t, EntityManager, ExecuteOrder, GameState, Hero } from "github.com/octarine-public/wrapper/index"

import { PudgeConfig } from "./config"
import { PudgeState } from "./state"
import { calcCastPos, isDirectionStable, isHookBlocked } from "./tracker"

export function runAutoHook(hero: Hero): void {
	if (!PudgeConfig.autoHookEnabled.value || PudgeState.autoHookSleeper.Sleeping) {
		return
	}
	if (hero.IsChanneling || hero.IsStunned || hero.IsSilenced || hero.IsHexed) {
		return
	}

	const hook = hero.GetAbilityByName("pudge_meat_hook")
	if (!hook || !hook.IsValid || hook.Level <= 0 || hook.Cooldown > 0.1 || hero.Mana < hook.ManaCost) {
		return
	}

	const hookRange = hook.CastRange > 0 ? hook.CastRange : 1300
	let best: Hero | undefined
	let bestDist = Infinity

	for (const en of EntityManager.GetEntitiesByClass(Hero)) {
		if (
			!en.IsValid ||
			!en.IsAlive ||
			!en.IsVisible ||
			!en.IsEnemy(hero) ||
			en.IsIllusion ||
			en.IsMagicImmune ||
			en.IsDebuffImmune
		) {
			continue
		}

		const isTeleporting = en.Buffs.some((b: any) => b.Name === "modifier_teleporting")
		if (!en.IsChanneling && !isTeleporting) {
			continue
		}
		const d = hero.Distance2D(en)
		if (d >= PudgeConfig.autoHookMinDist.value && d <= hookRange && d < bestDist) {
			bestDist = d
			best = en
		}
	}
	if (!best) {
		return
	}

	const dis = hero.GetAbilityByName("pudge_dismember")
	if (
		dis &&
		dis.Level > 0 &&
		dis.Cooldown <= 0.1 &&
		hero.Distance2D(best) <= (dis.CastRange > 0 ? dis.CastRange : 150)
	) {
		return
	}

	if (PudgeConfig.requireStable.value && !isDirectionStable(best.Index)) {
		return
	}

	const pos = calcCastPos(hero, best, hookRange)
	if (PudgeConfig.collisionCheck.value && isHookBlocked(hero, best, pos, hook)) {
		return
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
	PudgeState.autoHookSleeper.Sleep(GameState.InputLag * 1000 + hook.CastPoint * 1000 + 300)
}

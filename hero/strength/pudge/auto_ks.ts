import { dotaunitorder_t, EntityManager, ExecuteOrder, GameState, Hero } from "github.com/octarine-public/wrapper/index"

import { PudgeConfig } from "./config"
import { PudgeState } from "./state"
import { calcCastPos, isHookBlocked } from "./tracker"

export function runAutoKillSteal(hero: Hero): void {
	if (!PudgeConfig.autoKsEnabled.value || PudgeState.autoKsSleeper.Sleeping) {
		return
	}
	if (hero.IsChanneling || hero.IsStunned || hero.IsSilenced || hero.IsHexed || hero.IsInvisible) {
		return
	}

	const hook = hero.GetAbilityByName("pudge_meat_hook")
	if (!hook || !hook.IsValid || hook.Level <= 0 || hook.Cooldown > 0.1 || hero.Mana < hook.ManaCost) {
		return
	}

	const hookRange = hook.CastRange > 0 ? hook.CastRange : 1300

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

		if (hero.Distance2D(en) > hookRange) {
			continue
		}

		const hookDamage = hook.GetDamage(en)

		if (en.HP <= hookDamage && en.HP > 0) {
			const pos = calcCastPos(hero, en, hookRange)
			if (
				PudgeConfig.collisionCheck.value &&
				isHookBlocked(hero, en, pos, PudgeConfig.hookCollisionRadius.value)
			) {
				continue
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
			PudgeState.autoKsSleeper.Sleep(GameState.InputLag * 1000 + hook.CastPoint * 1000 + 150)
			break
		}
	}
}

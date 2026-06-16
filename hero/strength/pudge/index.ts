import {
	EntityManager,
	EventsSDK,
	ExecuteOrder,
	GameState,
	Hero,
	LocalPlayer
} from "github.com/octarine-public/wrapper/index"

import { runAutoFarm } from "./auto_farm"
import { runAutoHook } from "./auto_hook"
import { runAutoKillSteal } from "./auto_ks"
import { runCombo } from "./combo"
import { PudgeConfig } from "./config"
import { drawEsp } from "./esp"
import { PudgeState } from "./state"
import { updateTracker } from "./tracker"

new (class PudgeModule {
	constructor() {
		EventsSDK.on("PostDataUpdate", this.PostDataUpdate.bind(this))
		EventsSDK.on("Draw", drawEsp)
		EventsSDK.on("GameEnded", PudgeState.onGameEnded.bind(PudgeState))
	}

	private get hasLocalHero(): boolean {
		return (
			LocalPlayer !== undefined &&
			LocalPlayer.Hero !== undefined &&
			LocalPlayer.Hero.IsValid &&
			LocalPlayer.Hero.Name === "npc_dota_hero_pudge"
		)
	}

	private PostDataUpdate(delta: number): void {
		if (delta === 0 || !this.hasLocalHero || ExecuteOrder.DisableHumanizer) {
			return
		}
		const hero = LocalPlayer?.Hero
		if (
			!hero ||
			!hero.IsValid ||
			!hero.IsAlive ||
			!PudgeConfig.comboEnabled.value ||
			!PudgeConfig.comboSequenceGrid
		) {
			return
		}

		const now = GameState.RawGameTime
		if (now < PudgeState.lastRawGameTime) {
			PudgeState.onGameEnded()
		}
		PudgeState.lastRawGameTime = now

		for (const en of EntityManager.GetEntitiesByClass(Hero)) {
			if (en.IsValid && en.IsAlive && en.IsVisible && en.IsEnemy(hero) && !en.IsIllusion) {
				updateTracker(en)
			}
		}

		runAutoFarm(hero)
		runAutoHook(hero)
		runAutoKillSteal(hero)
		runCombo(hero)
	}
})()

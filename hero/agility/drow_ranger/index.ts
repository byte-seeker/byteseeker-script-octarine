import { EventsSDK, ExecuteOrder, LocalPlayer } from "github.com/octarine-public/wrapper/index"

import { isLocalHero } from "../../../utility/hero"
import { runAutoFrostArrows } from "./abilities"
import { DrowRangerState } from "./state"

new (class DrowRangerModule {
	constructor() {
		EventsSDK.on("PostDataUpdate", this.PostDataUpdate.bind(this))
		EventsSDK.on("GameEnded", DrowRangerState.onGameEnded.bind(DrowRangerState))
	}

	private get hasLocalHero(): boolean {
		return isLocalHero("npc_dota_hero_drow_ranger")
	}

	private PostDataUpdate(delta: number): void {
		if (delta === 0 || !this.hasLocalHero || ExecuteOrder.DisableHumanizer) {
			return
		}
		const hero = LocalPlayer?.Hero
		if (!hero || !hero.IsValid || !hero.IsAlive) {
			return
		}

		runAutoFrostArrows(hero)
	}
})()

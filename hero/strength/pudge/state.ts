import { TickSleeper } from "github.com/octarine-public/wrapper/index"

import { EnemyTracker } from "./types"

export const PudgeState = new (class {
	public readonly sleeper = new TickSleeper()
	public readonly rotSleeper = new TickSleeper()
	public readonly dismemberSleeper = new TickSleeper()
	public readonly farmSleeper = new TickSleeper()
	public readonly autoKsSleeper = new TickSleeper()
	public readonly autoHookSleeper = new TickSleeper()

	public wasRotTurnedOnByFarm = false
	public wasRotTurnedOnByCombo = false

	public readonly trackerMap = new Map<number, EnemyTracker>()

	public lastRawGameTime = 0

	public onGameEnded(): void {
		this.sleeper.ResetTimer()
		this.autoHookSleeper.ResetTimer()
		this.rotSleeper.ResetTimer()
		this.trackerMap.clear()
		this.farmSleeper.ResetTimer()
		this.autoKsSleeper.ResetTimer()
		this.dismemberSleeper.ResetTimer()

		this.wasRotTurnedOnByFarm = false
		this.wasRotTurnedOnByCombo = false
		this.lastRawGameTime = 0
	}
})()

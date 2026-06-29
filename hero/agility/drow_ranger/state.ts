import { TickSleeper } from "github.com/octarine-public/wrapper/index"

export const DrowRangerState = new (class {
	public readonly sleeper = new TickSleeper()

	public onGameEnded(): void {
		this.sleeper.ResetTimer()
	}
})()

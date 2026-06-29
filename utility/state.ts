import { TickSleeper } from "github.com/octarine-public/wrapper/index"

export class BaseState {
	public readonly sleeper = new TickSleeper()

	public onGameEnded(): void {
		this.sleeper.ResetTimer()
	}
}

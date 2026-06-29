import { LocalPlayer } from "github.com/octarine-public/wrapper/index"

export function isLocalHero(heroName: string): boolean {
	return (
		LocalPlayer !== undefined &&
		LocalPlayer.Hero !== undefined &&
		LocalPlayer.Hero.IsValid &&
		LocalPlayer.Hero.Name === heroName
	)
}

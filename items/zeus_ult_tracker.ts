import { EventsSDK, GameState, Hero, LocalPlayer, NetworkedParticle } from "github.com/octarine-public/wrapper/index"

/**
 * How long (in seconds) after the Zeus ult start particle fires
 * that we consider the ult as "active" for item/ability reactions.
 * Should cover Zeus cast point (~0.35s) + network jitter + item cast time.
 */
const ZEUS_ULT_REACT_WINDOW = 1.5

/**
 * RawGameTime when the Zeus ult start particle was last detected.
 * -1 means not detected this game.
 */
let zeusUltDetectedTime = -1

/**
 * Listens for the Zeus ult START particle, which is world-replicated to all
 * clients even when Zeus is in the fog of war. Unlike IsInAbilityPhase,
 * this works regardless of Zeus visibility.
 *
 * Particle: zuus_thundergods_wrath_start.vpcf
 * Source:   isAttachedTo (Zeus hero entity)
 */
EventsSDK.on("ParticleCreated", (par: NetworkedParticle) => {
	if (!par.PathNoEcon.includes("zuus_thundergods_wrath_start")) {
		return
	}

	const hero = LocalPlayer?.Hero
	if (hero === undefined) {
		return
	}

	// Validate the source entity when available.
	// When Zeus is in fog, par.Source is undefined — still safe to trust
	// the particle name since it is uniquely tied to Zeus ult cast.
	const source = par.Source
	if (source !== undefined) {
		if (!(source instanceof Hero)) {
			return
		}
		if (!source.IsEnemy(hero) || source.IsIllusion) {
			return
		}
	}

	zeusUltDetectedTime = GameState.RawGameTime
})

EventsSDK.on("GameEnded", () => {
	zeusUltDetectedTime = -1
})

/**
 * Returns true if a Zeus ult start particle was detected recently (within
 * ZEUS_ULT_REACT_WINDOW seconds). Combines with IsInAbilityPhase to cover
 * both visible and fog-of-war scenarios.
 */
export function isZeusUltParticleActive(): boolean {
	if (zeusUltDetectedTime < 0) {
		return false
	}
	const elapsed = GameState.RawGameTime - zeusUltDetectedTime
	return elapsed >= 0 && elapsed <= ZEUS_ULT_REACT_WINDOW
}

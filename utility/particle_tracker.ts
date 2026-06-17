/* eslint-disable jsdoc/check-indentation */
import { EventsSDK, GameState, Hero, LocalPlayer, NetworkedParticle } from "github.com/octarine-public/wrapper/index"

/**
 * Creates a particle-based enemy ability detector that works even when the
 * caster is in the fog of war.
 *
 * World-replicated particles (listed in network_particles.json) are broadcast
 * to all clients regardless of caster visibility. This lets us react to enemy
 * abilities faster and more reliably than polling IsInAbilityPhase.
 *
 * @param particlePathSubstring  Substring of the particle path to watch for.
 *                               E.g. "zuus_thundergods_wrath_start".
 *                               Compared against NetworkedParticle.PathNoEcon.
 * @param reactWindowSeconds     How long (in seconds) after detection the
 *                               tracker returns true. Defaults to 1.5s.
 *                               Should cover cast point + network jitter.
 * @returns A `() => boolean` function — call it anywhere to check whether
 *          the particle was detected within the react window.
 *
 * @example
 * // Module-level setup (runs once)
 * const isZeusUltActive = createEnemyParticleTracker("zuus_thundergods_wrath_start")
 *
 * // Per-frame usage
 * if (isZeusUltActive()) { ... }
 */
export function createEnemyParticleTracker(particlePathSubstring: string, reactWindowSeconds = 1.5): () => boolean {
	let detectedTime = -1

	EventsSDK.on("ParticleCreated", (par: NetworkedParticle) => {
		if (!par.PathNoEcon.includes(particlePathSubstring)) {
			return
		}

		const hero = LocalPlayer?.Hero
		if (hero === undefined) {
			return
		}

		// Validate the source entity when available.
		// When the caster is in fog, par.Source is undefined — still safe to
		// trust the particle name since it maps 1-to-1 with the ability.
		const source = par.Source
		if (source !== undefined) {
			if (!(source instanceof Hero)) {
				return
			}
			if (!source.IsEnemy(hero) || source.IsIllusion) {
				return
			}
		}

		detectedTime = GameState.RawGameTime
	})

	EventsSDK.on("GameEnded", () => {
		detectedTime = -1
	})

	return (): boolean => {
		if (detectedTime < 0) {
			return false
		}
		const elapsed = GameState.RawGameTime - detectedTime
		return elapsed >= 0 && elapsed <= reactWindowSeconds
	}
}

// ---------------------------------------------------------------------------
// Pre-configured trackers
// ---------------------------------------------------------------------------

/**
 * Returns true if a Zeus Thundergod's Wrath cast particle was detected recently.
 * Works even when Zeus is in the fog of war.
 *
 * Particle: zuus_thundergods_wrath_start.vpcf  (fires during cast phase)
 */
export const isZeusUltParticleActive = createEnemyParticleTracker("zuus_thundergods_wrath_start")

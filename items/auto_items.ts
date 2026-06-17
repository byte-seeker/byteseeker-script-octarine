import {
	dotaunitorder_t,
	EntityManager,
	EventsSDK,
	ExecuteOrder,
	GameState,
	Hero,
	ImageData,
	LocalPlayer,
	Menu,
	ProjectileManager,
	TickSleeper
} from "github.com/octarine-public/wrapper/index"

class AutoItemsUtility {
	private readonly entry = Menu.AddEntry("Byteseeker")
	private readonly node = this.entry.AddNode("Utility").AddNode("Auto Items")
	private readonly enabled = this.node.AddToggle("Enabled", true)

	// Item Settings Nodes
	private readonly eulNode = this.node.AddNode("Eul / Wind Waker", ImageData.GetItemTexture("item_cyclone"))
	private readonly eulEnabled = this.eulNode.AddToggle("Enabled", true)
	private readonly eulOnZeusUlt = this.eulNode.AddToggle("On Zeus Ult", true)
	private readonly eulOnLinaLionUlt = this.eulNode.AddToggle("On Lina/Lion Ult", true)
	private readonly eulOnProjectiles = this.eulNode.AddToggle("On Targeted Spells", true)

	private readonly bkbNode = this.node.AddNode("Black King Bar", ImageData.GetItemTexture("item_black_king_bar"))
	private readonly bkbEnabled = this.bkbNode.AddToggle("Enabled", false)
	private readonly bkbOnStuns = this.bkbNode.AddToggle("On Stun/Silence Projectiles", true)
	private readonly bkbOnZeusUlt = this.bkbNode.AddToggle("On Zeus Ult", false)

	private readonly lotusNode = this.node.AddNode("Lotus Orb", ImageData.GetItemTexture("item_lotus_orb"))
	private readonly lotusEnabled = this.lotusNode.AddToggle("Enabled", true)
	private readonly lotusOnProjectiles = this.lotusNode.AddToggle("On Targeted Spells", true)

	private readonly bmNode = this.node.AddNode("Blade Mail", ImageData.GetItemTexture("item_blade_mail"))
	private readonly bmEnabled = this.bmNode.AddToggle("Enabled", false)
	private readonly bmOnZeusUlt = this.bmNode.AddToggle("On Zeus Ult", true)
	private readonly bmOnLinaLionUlt = this.bmNode.AddToggle("On Lina/Lion Ult", true)

	private readonly glimmerNode = this.node.AddNode("Glimmer Cape", ImageData.GetItemTexture("item_glimmer_cape"))
	private readonly glimmerEnabled = this.glimmerNode.AddToggle("Enabled", false)
	private readonly glimmerOnProjectiles = this.glimmerNode.AddToggle("On Targeted Spells", true)

	private readonly pipeNode = this.node.AddNode("Pipe of Insight", ImageData.GetItemTexture("item_pipe"))
	private readonly pipeEnabled = this.pipeNode.AddToggle("Enabled", false)
	private readonly pipeOnZeusUlt = this.pipeNode.AddToggle("On Zeus Ult", true)

	private readonly sleeper = new TickSleeper()

	constructor() {
		EventsSDK.on("PostDataUpdate", this.PostDataUpdate.bind(this))
		EventsSDK.on("GameEnded", this.GameEnded.bind(this))
	}

	private get hasLocalHero(): boolean {
		return LocalPlayer?.Hero !== undefined
	}

	private PostDataUpdate(delta: number): void {
		if (delta === 0 || !this.hasLocalHero || ExecuteOrder.DisableHumanizer || this.sleeper.Sleeping) {
			return
		}

		const hero = LocalPlayer?.Hero
		if (hero === undefined || !hero.IsValid || !hero.IsAlive) {
			return
		}

		// If channeling, stunned, hexed, muted, or invisible, do not auto-cast items
		if (hero.IsChanneling || hero.IsStunned || hero.IsHexed || hero.IsMuted || hero.IsInvisible) {
			return
		}

		if (this.enabled.value) {
			this.evaluateAutoItems(hero)
		}
	}

	private evaluateAutoItems(hero: Hero): void {
		// 1. Check Eul's Scepter / Wind Waker
		const eul = this.eulEnabled.value
			? hero.Inventory.GetItemByName("item_cyclone") || hero.Inventory.GetItemByName("item_wind_waker")
			: null

		// 2. Check BKB
		const bkb = this.bkbEnabled.value ? hero.Inventory.GetItemByName("item_black_king_bar") : null

		// 3. Check Lotus Orb
		const lotus = this.lotusEnabled.value ? hero.Inventory.GetItemByName("item_lotus_orb") : null

		// 4. Check Blade Mail
		const bm = this.bmEnabled.value ? hero.Inventory.GetItemByName("item_blade_mail") : null

		// 5. Check Glimmer Cape
		const glimmer = this.glimmerEnabled.value ? hero.Inventory.GetItemByName("item_glimmer_cape") : null

		// 6. Check Pipe
		const pipe = this.pipeEnabled.value ? hero.Inventory.GetItemByName("item_pipe") : null

		// Triggers
		let triggerZeus = false
		let triggerLina = false
		let triggerLion = false
		let triggerProjectile = false
		let targetSpellIsStunOrSilence = false

		// Check Zeus casting ultimate
		const checkZeus =
			(eul !== null && this.eulOnZeusUlt.value) ||
			(bkb !== null && this.bkbOnZeusUlt.value) ||
			(bm !== null && this.bmOnZeusUlt.value) ||
			(pipe !== null && this.pipeOnZeusUlt.value)

		if (checkZeus) {
			for (const enemy of EntityManager.GetEntitiesByClass(Hero)) {
				if (
					enemy.IsValid &&
					enemy.IsAlive &&
					enemy.IsEnemy(hero) &&
					!enemy.IsIllusion &&
					enemy.Name === "npc_dota_hero_zuus"
				) {
					const ult = enemy.GetAbilityByName("zuus_thundergods_wrath")
					if (ult && ult.IsValid && ult.Level > 0 && ult.IsInAbilityPhase) {
						triggerZeus = true
						break
					}
				}
			}
		}

		// Check Lina / Lion casting ultimate targeting local hero
		const checkLinaLion =
			(eul !== null && this.eulOnLinaLionUlt.value) || (bm !== null && this.bmOnLinaLionUlt.value)

		if (checkLinaLion) {
			for (const enemy of EntityManager.GetEntitiesByClass(Hero)) {
				if (enemy.IsValid && enemy.IsAlive && enemy.IsEnemy(hero) && !enemy.IsIllusion) {
					if (enemy.Name === "npc_dota_hero_lina") {
						const ult = enemy.GetAbilityByName("lina_laguna_blade")
						if (ult && ult.IsValid && ult.Level > 0 && ult.IsInAbilityPhase) {
							if (hero.Distance2D(enemy) <= ult.CastRange + 100 && Math.abs(enemy.GetAngle(hero)) < 0.2) {
								triggerLina = true
							}
						}
					} else if (enemy.Name === "npc_dota_hero_lion") {
						const ult = enemy.GetAbilityByName("lion_finger_of_death")
						if (ult && ult.IsValid && ult.Level > 0 && ult.IsInAbilityPhase) {
							if (hero.Distance2D(enemy) <= ult.CastRange + 100 && Math.abs(enemy.GetAngle(hero)) < 0.2) {
								triggerLion = true
							}
						}
					}
				}
			}
		}

		// Check incoming spell projectiles
		const checkProjectiles =
			(eul !== null && this.eulOnProjectiles.value) ||
			(bkb !== null && this.bkbOnStuns.value) ||
			(lotus !== null && this.lotusOnProjectiles.value) ||
			(glimmer !== null && this.glimmerOnProjectiles.value)

		if (checkProjectiles) {
			for (const proj of ProjectileManager.AllTrackingProjectiles) {
				if (proj.Target === hero && !proj.IsDodged && !proj.IsAttack) {
					triggerProjectile = true
					const abilityName = proj.Ability?.Name || ""
					if (
						abilityName !== "" &&
						(abilityName.includes("stun") ||
							abilityName.includes("hex") ||
							abilityName.includes("silence") ||
							abilityName.includes("shackle") ||
							abilityName.includes("bolt") ||
							abilityName.includes("hammer") ||
							abilityName.includes("magic_missile") ||
							abilityName.includes("assassinate") ||
							abilityName.includes("campsite"))
					) {
						targetSpellIsStunOrSilence = true
					}
				}
			}
		}

		// Activate items based on matching conditions
		// 1. Eul's / Wind Waker (Self-Cast)
		if (eul && eul.CanBeCasted()) {
			if (
				(this.eulOnZeusUlt.value && triggerZeus) ||
				(this.eulOnLinaLionUlt.value && (triggerLina || triggerLion)) ||
				(this.eulOnProjectiles.value && triggerProjectile)
			) {
				this.castTargetItem(hero, eul, hero)
				return
			}
		}

		// 2. Lotus Orb (Self-Cast)
		if (lotus && lotus.CanBeCasted()) {
			if (this.lotusOnProjectiles.value && triggerProjectile) {
				this.castTargetItem(hero, lotus, hero)
				return
			}
		}

		// 3. Glimmer Cape (Self-Cast)
		if (glimmer && glimmer.CanBeCasted()) {
			if (this.glimmerOnProjectiles.value && triggerProjectile) {
				this.castTargetItem(hero, glimmer, hero)
				return
			}
		}

		// 4. BKB (No-Target)
		if (bkb && bkb.CanBeCasted()) {
			if ((this.bkbOnStuns.value && targetSpellIsStunOrSilence) || (this.bkbOnZeusUlt.value && triggerZeus)) {
				this.castNoTargetItem(hero, bkb)
				return
			}
		}

		// 5. Blade Mail (No-Target)
		if (bm && bm.CanBeCasted()) {
			if (
				(this.bmOnZeusUlt.value && triggerZeus) ||
				(this.bmOnLinaLionUlt.value && (triggerLina || triggerLion))
			) {
				this.castNoTargetItem(hero, bm)
				return
			}
		}

		// 6. Pipe of Insight (No-Target)
		if (pipe && pipe.CanBeCasted()) {
			if (this.pipeOnZeusUlt.value && triggerZeus) {
				this.castNoTargetItem(hero, pipe)
			}
		}
	}

	private castTargetItem(hero: Hero, item: any, target: Hero): void {
		ExecuteOrder.PrepareOrder({
			orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_TARGET,
			issuers: [hero],
			target: target.Index,
			ability: item.Index,
			queue: false,
			showEffects: true,
			isPlayerInput: false
		})
		this.sleeper.Sleep(GameState.InputLag * 1000 + 250)
	}

	private castNoTargetItem(hero: Hero, item: any): void {
		ExecuteOrder.PrepareOrder({
			orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_NO_TARGET,
			issuers: [hero],
			ability: item.Index,
			queue: false,
			showEffects: true,
			isPlayerInput: false
		})
		this.sleeper.Sleep(GameState.InputLag * 1000 + 250)
	}

	private GameEnded(): void {
		this.sleeper.ResetTimer()
	}
}

new AutoItemsUtility()

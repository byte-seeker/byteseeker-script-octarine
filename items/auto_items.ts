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

import { isZeusUltParticleActive } from "./zeus_ult_tracker"

class AutoItemsUtility {
	private readonly entry = Menu.AddEntry("Byteseeker")
	private readonly node = this.entry
		.AddNode("Utility", ImageData.Icons.icon_settings)
		.AddNode("Auto Items", ImageData.Icons.icon_damage)
	private readonly enabled = this.node.AddToggle("Enabled", true)

	private readonly itemsSelector: Menu.DynamicImageSelector

	// Item Settings Nodes & Triggers Selectors
	private readonly eulNode = this.node.AddNode("Eul / Wind Waker Settings", ImageData.GetItemTexture("item_cyclone"))
	private readonly eulTriggers: Menu.DynamicImageSelector

	private readonly bkbNode = this.node.AddNode(
		"Black King Bar Settings",
		ImageData.GetItemTexture("item_black_king_bar")
	)
	private readonly bkbTriggers: Menu.DynamicImageSelector

	private readonly lotusNode = this.node.AddNode("Lotus Orb Settings", ImageData.GetItemTexture("item_lotus_orb"))
	private readonly lotusTriggers: Menu.DynamicImageSelector

	private readonly bmNode = this.node.AddNode("Blade Mail Settings", ImageData.GetItemTexture("item_blade_mail"))
	private readonly bmTriggers: Menu.DynamicImageSelector

	private readonly glimmerNode = this.node.AddNode(
		"Glimmer Cape Settings",
		ImageData.GetItemTexture("item_glimmer_cape")
	)
	private readonly glimmerTriggers: Menu.DynamicImageSelector

	private readonly pipeNode = this.node.AddNode("Pipe of Insight Settings", ImageData.GetItemTexture("item_pipe"))
	private readonly pipeTriggers: Menu.DynamicImageSelector

	private readonly sleeper = new TickSleeper()

	constructor() {
		// 1. Items Main Priority Selector
		const itemsDef = new Map<string, [boolean, boolean, boolean, number]>()
		itemsDef.set("item_cyclone", [true, true, true, 0])
		itemsDef.set("item_wind_waker", [true, true, true, 1])
		itemsDef.set("item_black_king_bar", [true, true, true, 2])
		itemsDef.set("item_lotus_orb", [true, true, true, 3])
		itemsDef.set("item_blade_mail", [true, true, true, 4])
		itemsDef.set("item_glimmer_cape", [true, true, true, 5])
		itemsDef.set("item_pipe", [true, true, true, 6])

		this.itemsSelector = this.node.AddDynamicImageSelector(
			"Items Priority & Toggle",
			[
				"item_cyclone",
				"item_wind_waker",
				"item_black_king_bar",
				"item_lotus_orb",
				"item_blade_mail",
				"item_glimmer_cape",
				"item_pipe"
			],
			itemsDef
		)

		// 2. Eul / Wind Waker Triggers
		const eulDef = new Map<string, [boolean, boolean, boolean, number]>()
		eulDef.set("zuus_thundergods_wrath", [true, true, true, 0])
		eulDef.set("lina_laguna_blade", [true, true, true, 1])
		eulDef.set("lion_finger_of_death", [true, true, true, 2])
		eulDef.set("phantom_assassin_stifling_dagger", [true, true, true, 3]) // Represent targeted spells

		this.eulTriggers = this.eulNode.AddDynamicImageSelector(
			"Eul Triggers (Zeus Ult / Lina Ult / Lion Ult / Targeted Spells)",
			["zuus_thundergods_wrath", "lina_laguna_blade", "lion_finger_of_death", "phantom_assassin_stifling_dagger"],
			eulDef
		)

		// 3. Black King Bar Triggers
		const bkbDef = new Map<string, [boolean, boolean, boolean, number]>()
		bkbDef.set("sven_storm_bolt", [true, true, true, 0]) // Represent stun/silence projectiles
		bkbDef.set("zuus_thundergods_wrath", [false, true, true, 1])

		this.bkbTriggers = this.bkbNode.AddDynamicImageSelector(
			"BKB Triggers (Stun/Silence Spells / Zeus Ult)",
			["sven_storm_bolt", "zuus_thundergods_wrath"],
			bkbDef
		)

		// 4. Lotus Orb Triggers
		const lotusDef = new Map<string, [boolean, boolean, boolean, number]>()
		lotusDef.set("phantom_assassin_stifling_dagger", [true, true, true, 0]) // Represent targeted spells

		this.lotusTriggers = this.lotusNode.AddDynamicImageSelector(
			"Lotus Triggers (Targeted Spells)",
			["phantom_assassin_stifling_dagger"],
			lotusDef
		)

		// 5. Blade Mail Triggers
		const bmDef = new Map<string, [boolean, boolean, boolean, number]>()
		bmDef.set("zuus_thundergods_wrath", [true, true, true, 0])
		bmDef.set("lina_laguna_blade", [true, true, true, 1])
		bmDef.set("lion_finger_of_death", [true, true, true, 2])

		this.bmTriggers = this.bmNode.AddDynamicImageSelector(
			"Blade Mail Triggers (Zeus Ult / Lina Ult / Lion Ult)",
			["zuus_thundergods_wrath", "lina_laguna_blade", "lion_finger_of_death"],
			bmDef
		)

		// 6. Glimmer Cape Triggers
		const glimmerDef = new Map<string, [boolean, boolean, boolean, number]>()
		glimmerDef.set("phantom_assassin_stifling_dagger", [true, true, true, 0]) // Represent targeted spells

		this.glimmerTriggers = this.glimmerNode.AddDynamicImageSelector(
			"Glimmer Triggers (Targeted Spells)",
			["phantom_assassin_stifling_dagger"],
			glimmerDef
		)

		// 7. Pipe of Insight Triggers
		const pipeDef = new Map<string, [boolean, boolean, boolean, number]>()
		pipeDef.set("zuus_thundergods_wrath", [true, true, true, 0])

		this.pipeTriggers = this.pipeNode.AddDynamicImageSelector(
			"Pipe Triggers (Zeus Ult)",
			["zuus_thundergods_wrath"],
			pipeDef
		)

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
		// Triggers
		let triggerZeus = false
		let triggerLina = false
		let triggerLion = false
		let triggerProjectile = false
		let targetSpellIsStunOrSilence = false

		// Check Zeus casting ultimate
		const checkZeus =
			(this.itemsSelector.IsEnabled("item_cyclone") && this.eulTriggers.IsEnabled("zuus_thundergods_wrath")) ||
			(this.itemsSelector.IsEnabled("item_wind_waker") && this.eulTriggers.IsEnabled("zuus_thundergods_wrath")) ||
			(this.itemsSelector.IsEnabled("item_black_king_bar") &&
				this.bkbTriggers.IsEnabled("zuus_thundergods_wrath")) ||
			(this.itemsSelector.IsEnabled("item_blade_mail") && this.bmTriggers.IsEnabled("zuus_thundergods_wrath")) ||
			(this.itemsSelector.IsEnabled("item_pipe") && this.pipeTriggers.IsEnabled("zuus_thundergods_wrath"))

		if (checkZeus) {
			// Primary: check IsInAbilityPhase (only works when Zeus is visible)
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

			// Fallback: particle-based detection works even when Zeus is in fog of war.
			// zuus_thundergods_wrath_start.vpcf is world-replicated to all clients.
			if (!triggerZeus && isZeusUltParticleActive()) {
				triggerZeus = true
			}
		}

		// Check Lina / Lion casting ultimate targeting local hero
		const checkLinaLion =
			(this.itemsSelector.IsEnabled("item_cyclone") &&
				(this.eulTriggers.IsEnabled("lina_laguna_blade") ||
					this.eulTriggers.IsEnabled("lion_finger_of_death"))) ||
			(this.itemsSelector.IsEnabled("item_wind_waker") &&
				(this.eulTriggers.IsEnabled("lina_laguna_blade") ||
					this.eulTriggers.IsEnabled("lion_finger_of_death"))) ||
			(this.itemsSelector.IsEnabled("item_blade_mail") &&
				(this.bmTriggers.IsEnabled("lina_laguna_blade") || this.bmTriggers.IsEnabled("lion_finger_of_death")))

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
			(this.itemsSelector.IsEnabled("item_cyclone") &&
				this.eulTriggers.IsEnabled("phantom_assassin_stifling_dagger")) ||
			(this.itemsSelector.IsEnabled("item_wind_waker") &&
				this.eulTriggers.IsEnabled("phantom_assassin_stifling_dagger")) ||
			(this.itemsSelector.IsEnabled("item_black_king_bar") && this.bkbTriggers.IsEnabled("sven_storm_bolt")) ||
			(this.itemsSelector.IsEnabled("item_lotus_orb") &&
				this.lotusTriggers.IsEnabled("phantom_assassin_stifling_dagger")) ||
			(this.itemsSelector.IsEnabled("item_glimmer_cape") &&
				this.glimmerTriggers.IsEnabled("phantom_assassin_stifling_dagger"))

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

		// Iterate through items by their priority order (as sorted in menu)
		for (const itemName of this.itemsSelector.values) {
			if (!this.itemsSelector.IsEnabled(itemName)) {
				continue
			}

			const item = hero.Inventory.GetItemByName(itemName)
			if (!item || !item.CanBeCasted()) {
				continue
			}

			// 1. Eul's / Wind Waker (Self-Cast)
			if (itemName === "item_cyclone" || itemName === "item_wind_waker") {
				const zeusActive = this.eulTriggers.IsEnabled("zuus_thundergods_wrath") && triggerZeus
				const linaActive = this.eulTriggers.IsEnabled("lina_laguna_blade") && triggerLina
				const lionActive = this.eulTriggers.IsEnabled("lion_finger_of_death") && triggerLion
				const projActive = this.eulTriggers.IsEnabled("phantom_assassin_stifling_dagger") && triggerProjectile

				if (zeusActive || linaActive || lionActive || projActive) {
					this.castTargetItem(hero, item, hero)
					return
				}
			}

			// 2. Lotus Orb (Self-Cast)
			if (itemName === "item_lotus_orb") {
				if (this.lotusTriggers.IsEnabled("phantom_assassin_stifling_dagger") && triggerProjectile) {
					this.castTargetItem(hero, item, hero)
					return
				}
			}

			// 3. Glimmer Cape (Self-Cast)
			if (itemName === "item_glimmer_cape") {
				if (this.glimmerTriggers.IsEnabled("phantom_assassin_stifling_dagger") && triggerProjectile) {
					this.castTargetItem(hero, item, hero)
					return
				}
			}

			// 4. BKB (No-Target)
			if (itemName === "item_black_king_bar") {
				const stunActive = this.bkbTriggers.IsEnabled("sven_storm_bolt") && targetSpellIsStunOrSilence
				const zeusActive = this.bkbTriggers.IsEnabled("zuus_thundergods_wrath") && triggerZeus

				if (stunActive || zeusActive) {
					this.castNoTargetItem(hero, item)
					return
				}
			}

			// 5. Blade Mail (No-Target)
			if (itemName === "item_blade_mail") {
				const zeusActive = this.bmTriggers.IsEnabled("zuus_thundergods_wrath") && triggerZeus
				const linaActive = this.bmTriggers.IsEnabled("lina_laguna_blade") && triggerLina
				const lionActive = this.bmTriggers.IsEnabled("lion_finger_of_death") && triggerLion

				if (zeusActive || linaActive || lionActive) {
					this.castNoTargetItem(hero, item)
					return
				}
			}

			// 6. Pipe of Insight (No-Target)
			if (itemName === "item_pipe") {
				if (this.pipeTriggers.IsEnabled("zuus_thundergods_wrath") && triggerZeus) {
					this.castNoTargetItem(hero, item)
					return
				}
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

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

import { isZeusUltParticleActive } from "../utility/particle_tracker"

class AutoItemsUtility {
	private readonly entry = Menu.AddEntry("Byteseeker")
	private readonly node = this.entry.AddNode("Auto Items", ImageData.Icons.icon_damage)
	private readonly enabled = this.node.AddToggle("Enabled", true)

	private readonly itemsSelector: Menu.DynamicImageSelector

	// Eul / Wind Waker Settings
	private readonly eulNode = this.node.AddNode("Eul / Wind Waker Settings", ImageData.GetItemTexture("item_cyclone"))
	private readonly eulSpells: Menu.DynamicImageSelector
	private readonly eulTargeted = this.eulNode.AddToggle("Auto Use on Targeted Spells", true)

	// Black King Bar Settings
	private readonly bkbNode = this.node.AddNode(
		"Black King Bar Settings",
		ImageData.GetItemTexture("item_black_king_bar")
	)
	private readonly bkbSpells: Menu.DynamicImageSelector
	private readonly bkbStunSilence = this.bkbNode.AddToggle("Auto Use on Stun/Silence Projectiles", true)

	// Lotus Orb Settings
	private readonly lotusNode = this.node.AddNode("Lotus Orb Settings", ImageData.GetItemTexture("item_lotus_orb"))
	private readonly lotusTargeted = this.lotusNode.AddToggle("Auto Use on Targeted Spells", true)

	// Blade Mail Settings
	private readonly bmNode = this.node.AddNode("Blade Mail Settings", ImageData.GetItemTexture("item_blade_mail"))
	private readonly bmSpells: Menu.DynamicImageSelector

	// Glimmer Cape Settings
	private readonly glimmerNode = this.node.AddNode(
		"Glimmer Cape Settings",
		ImageData.GetItemTexture("item_glimmer_cape")
	)
	private readonly glimmerTargeted = this.glimmerNode.AddToggle("Auto Use on Targeted Spells", true)

	// Pipe of Insight Settings
	private readonly pipeNode = this.node.AddNode("Pipe of Insight Settings", ImageData.GetItemTexture("item_pipe"))
	private readonly pipeSpells: Menu.DynamicImageSelector

	// Manta Style Settings
	private readonly mantaNode = this.node.AddNode("Manta Style Settings", ImageData.GetItemTexture("item_manta"))
	private readonly mantaSpells: Menu.DynamicImageSelector

	// Shadow Blade / Silver Edge Settings
	private readonly sbNode = this.node.AddNode(
		"Shadow Blade / Silver Edge Settings",
		ImageData.GetItemTexture("item_invis_sword")
	)
	private readonly sbTargeted = this.sbNode.AddToggle("Auto Use on Targeted Spells", true)

	private readonly sleeper = new TickSleeper()

	private zeusUltCastStartTime = -1
	private lastZeusUltCastState = false
	private zeusUltCastPoint = 0.4

	private linaUltCastStartTime = -1
	private lastLinaUltCastState = false
	private linaUltCastPoint = 0.45

	private lionUltCastStartTime = -1
	private lastLionUltCastState = false
	private lionUltCastPoint = 0.3

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
		itemsDef.set("item_silver_edge", [true, true, true, 7])
		itemsDef.set("item_invis_sword", [true, true, true, 8])
		itemsDef.set("item_manta", [true, true, true, 9])

		this.itemsSelector = this.node.AddDynamicImageSelector(
			"Items Priority & Toggle",
			[
				"item_cyclone",
				"item_wind_waker",
				"item_black_king_bar",
				"item_lotus_orb",
				"item_blade_mail",
				"item_glimmer_cape",
				"item_pipe",
				"item_silver_edge",
				"item_invis_sword",
				"item_manta"
			],
			itemsDef
		)

		// 2. Eul / Wind Waker Triggers
		const eulDef = new Map<string, [boolean, boolean, boolean, number]>()
		eulDef.set("zuus_thundergods_wrath", [true, true, true, 0])
		eulDef.set("lina_laguna_blade", [true, true, true, 1])
		eulDef.set("lion_finger_of_death", [true, true, true, 2])
		this.eulSpells = this.eulNode.AddDynamicImageSelector(
			"Enemy Ultimate Triggers",
			["zuus_thundergods_wrath", "lina_laguna_blade", "lion_finger_of_death"],
			eulDef
		)

		// 3. Black King Bar Triggers
		const bkbDef = new Map<string, [boolean, boolean, boolean, number]>()
		bkbDef.set("zuus_thundergods_wrath", [true, true, true, 0])
		this.bkbSpells = this.bkbNode.AddDynamicImageSelector(
			"Enemy Ultimate Triggers",
			["zuus_thundergods_wrath"],
			bkbDef
		)

		// 4. Blade Mail Triggers
		const bmDef = new Map<string, [boolean, boolean, boolean, number]>()
		bmDef.set("zuus_thundergods_wrath", [true, true, true, 0])
		bmDef.set("lina_laguna_blade", [true, true, true, 1])
		bmDef.set("lion_finger_of_death", [true, true, true, 2])
		this.bmSpells = this.bmNode.AddDynamicImageSelector(
			"Enemy Ultimate Triggers",
			["zuus_thundergods_wrath", "lina_laguna_blade", "lion_finger_of_death"],
			bmDef
		)

		// 5. Pipe of Insight Triggers
		const pipeDef = new Map<string, [boolean, boolean, boolean, number]>()
		pipeDef.set("zuus_thundergods_wrath", [true, true, true, 0])
		this.pipeSpells = this.pipeNode.AddDynamicImageSelector(
			"Enemy Ultimate Triggers",
			["zuus_thundergods_wrath"],
			pipeDef
		)

		// 7. Manta Style Triggers
		const mantaDef = new Map<string, [boolean, boolean, boolean, number]>()
		mantaDef.set("zuus_thundergods_wrath", [true, true, true, 0])
		mantaDef.set("lina_laguna_blade", [true, true, true, 1])
		mantaDef.set("lion_finger_of_death", [true, true, true, 2])
		this.mantaSpells = this.mantaNode.AddDynamicImageSelector(
			"Enemy Ultimate Triggers",
			["zuus_thundergods_wrath", "lina_laguna_blade", "lion_finger_of_death"],
			mantaDef
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
		// 1. Evaluate Active Threats
		let isZeusCasting = false
		let isLinaCasting = false
		let isLionCasting = false
		let isTargetedProjectileIncoming = false
		let isStunSilenceIncoming = false

		// Check Enemy Ultimates
		for (const enemy of EntityManager.GetEntitiesByClass(Hero)) {
			if (!enemy.IsValid || !enemy.IsAlive || !enemy.IsEnemy(hero) || enemy.IsIllusion) {
				continue
			}

			if (enemy.Name === "npc_dota_hero_zuus") {
				const ult = enemy.GetAbilityByName("zuus_thundergods_wrath")
				if (ult && ult.IsValid && ult.Level > 0 && ult.IsInAbilityPhase) {
					isZeusCasting = true
					this.zeusUltCastPoint = ult.CastPoint > 0 ? ult.CastPoint : 0.4
				}
			} else if (enemy.Name === "npc_dota_hero_lina") {
				const ult = enemy.GetAbilityByName("lina_laguna_blade")
				if (ult && ult.IsValid && ult.Level > 0 && ult.IsInAbilityPhase) {
					if (hero.Distance2D(enemy) <= ult.CastRange + 100 && Math.abs(enemy.GetAngle(hero)) < 0.2) {
						isLinaCasting = true
						this.linaUltCastPoint = ult.CastPoint > 0 ? ult.CastPoint : 0.45
					}
				}
			} else if (enemy.Name === "npc_dota_hero_lion") {
				const ult = enemy.GetAbilityByName("lion_finger_of_death")
				if (ult && ult.IsValid && ult.Level > 0 && ult.IsInAbilityPhase) {
					if (hero.Distance2D(enemy) <= ult.CastRange + 100 && Math.abs(enemy.GetAngle(hero)) < 0.2) {
						isLionCasting = true
						this.lionUltCastPoint = ult.CastPoint > 0 ? ult.CastPoint : 0.3
					}
				}
			}
		}

		// Fallback for Zeus in Fog of War
		if (!isZeusCasting && isZeusUltParticleActive()) {
			isZeusCasting = true
		}

		if (isZeusCasting && !this.lastZeusUltCastState) {
			const particleStartTime = isZeusUltParticleActive.getStartTime()
			this.zeusUltCastStartTime = particleStartTime > 0 ? particleStartTime : GameState.RawGameTime
		} else if (!isZeusCasting) {
			this.zeusUltCastStartTime = -1
		}
		this.lastZeusUltCastState = isZeusCasting

		// Lina Cast tracking
		if (isLinaCasting && !this.lastLinaUltCastState) {
			this.linaUltCastStartTime = GameState.RawGameTime
		} else if (!isLinaCasting) {
			this.linaUltCastStartTime = -1
		}
		this.lastLinaUltCastState = isLinaCasting

		// Lion Cast tracking
		if (isLionCasting && !this.lastLionUltCastState) {
			this.lionUltCastStartTime = GameState.RawGameTime
		} else if (!isLionCasting) {
			this.lionUltCastStartTime = -1
		}
		this.lastLionUltCastState = isLionCasting

		// Check Incoming Spell Projectiles
		for (const proj of ProjectileManager.AllTrackingProjectiles) {
			if (proj.Target === hero && !proj.IsDodged && !proj.IsAttack) {
				isTargetedProjectileIncoming = true

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
					isStunSilenceIncoming = true
				}
			}
		}

		// If there is no threat at all, we can exit early and save performance
		if (
			!isZeusCasting &&
			!isLinaCasting &&
			!isLionCasting &&
			!isTargetedProjectileIncoming &&
			!isStunSilenceIncoming
		) {
			return
		}

		// 2. Iterate through Items based on priority
		for (const itemName of this.itemsSelector.values) {
			if (!this.itemsSelector.IsEnabled(itemName)) {
				continue
			}

			const item = hero.Inventory.GetItemByName(itemName)
			if (!item || !item.CanBeCasted()) {
				continue
			}

			// Evaluate Eul's Scepter & Wind Waker
			if (itemName === "item_cyclone" || itemName === "item_wind_waker") {
				const zeusActive = this.eulSpells.IsEnabled("zuus_thundergods_wrath") && isZeusCasting
				const linaActive = this.eulSpells.IsEnabled("lina_laguna_blade") && isLinaCasting
				const lionActive = this.eulSpells.IsEnabled("lion_finger_of_death") && isLionCasting
				const projActive = this.eulTargeted.value && isTargetedProjectileIncoming

				if (zeusActive || linaActive || lionActive || projActive) {
					this.castTargetItem(hero, item, hero)
					return // Only use one item per frame
				}
			}

			// Evaluate Black King Bar
			if (itemName === "item_black_king_bar") {
				const zeusActive = this.bkbSpells.IsEnabled("zuus_thundergods_wrath") && isZeusCasting
				const stunActive = this.bkbStunSilence.value && isStunSilenceIncoming

				if (zeusActive || stunActive) {
					this.castNoTargetItem(hero, item)
					return
				}
			}

			// Evaluate Lotus Orb
			if (itemName === "item_lotus_orb") {
				if (this.lotusTargeted.value && isTargetedProjectileIncoming) {
					this.castTargetItem(hero, item, hero)
					return
				}
			}

			// Evaluate Blade Mail
			if (itemName === "item_blade_mail") {
				const zeusActive = this.bmSpells.IsEnabled("zuus_thundergods_wrath") && isZeusCasting
				const linaActive = this.bmSpells.IsEnabled("lina_laguna_blade") && isLinaCasting
				const lionActive = this.bmSpells.IsEnabled("lion_finger_of_death") && isLionCasting

				if (zeusActive || linaActive || lionActive) {
					this.castNoTargetItem(hero, item)
					return
				}
			}

			// Evaluate Glimmer Cape
			if (itemName === "item_glimmer_cape") {
				if (this.glimmerTargeted.value && isTargetedProjectileIncoming) {
					this.castTargetItem(hero, item, hero)
					return
				}
			}

			// Evaluate Pipe of Insight
			if (itemName === "item_pipe") {
				if (this.pipeSpells.IsEnabled("zuus_thundergods_wrath") && isZeusCasting) {
					this.castNoTargetItem(hero, item)
					return
				}
			}

			// Evaluate Shadow Blade / Silver Edge
			if (itemName === "item_invis_sword" || itemName === "item_silver_edge") {
				const projActive = this.sbTargeted.value && isTargetedProjectileIncoming

				if (projActive) {
					this.castNoTargetItem(hero, item)
					return
				}
			}

			// Evaluate Manta Style
			if (itemName === "item_manta") {
				let zeusMantaActive = false
				if (this.mantaSpells.IsEnabled("zuus_thundergods_wrath") && isZeusCasting) {
					if (this.zeusUltCastStartTime > 0) {
						const elapsed = GameState.RawGameTime - this.zeusUltCastStartTime
						if (elapsed >= this.zeusUltCastPoint - 0.05) {
							zeusMantaActive = true
						}
					}
				}

				let linaMantaActive = false
				if (this.mantaSpells.IsEnabled("lina_laguna_blade") && isLinaCasting) {
					if (this.linaUltCastStartTime > 0) {
						const elapsed = GameState.RawGameTime - this.linaUltCastStartTime
						if (elapsed >= this.linaUltCastPoint - 0.05) {
							linaMantaActive = true
						}
					}
				}

				let lionMantaActive = false
				if (this.mantaSpells.IsEnabled("lion_finger_of_death") && isLionCasting) {
					if (this.lionUltCastStartTime > 0) {
						const elapsed = GameState.RawGameTime - this.lionUltCastStartTime
						if (elapsed >= this.lionUltCastPoint - 0.05) {
							lionMantaActive = true
						}
					}
				}

				if (zeusMantaActive || linaMantaActive || lionMantaActive) {
					this.castMantaPerfect(hero, item)
					return
				}
			}
		}
	}

	private getHumanizerJitter(): number {
		// Returns a random delay between 0ms to 60ms to avoid static patterns for anti-cheat
		return Math.floor(Math.random() * 60)
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
		this.sleeper.Sleep(GameState.InputLag * 1000 + 190 + this.getHumanizerJitter())
	}

	private castMantaPerfect(hero: Hero, item: any): void {
		ExecuteOrder.PrepareOrder({
			orderType: dotaunitorder_t.DOTA_UNIT_ORDER_CAST_NO_TARGET,
			issuers: [hero],
			ability: item.Index,
			queue: false,
			showEffects: true,
			isPlayerInput: false
		})
		// Ignore InputLag and Humanizer to ensure frame-perfect dodge timing
		this.sleeper.Sleep(200)
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
		this.sleeper.Sleep(GameState.InputLag * 1000 + 190 + this.getHumanizerJitter())
	}

	private GameEnded(): void {
		this.sleeper.ResetTimer()
	}
}

new AutoItemsUtility()

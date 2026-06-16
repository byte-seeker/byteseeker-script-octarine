import {
	Attributes,
	Color,
	EntityManager,
	EventsSDK,
	ExecuteOrder,
	Hero,
	ImageData,
	LocalPlayer,
	Menu,
	RendererSDK,
	Vector2
} from "github.com/octarine-public/wrapper/index"

interface CounterRule {
	targetName: string // Hero name or Item name
	counterItem: string // e.g. "item_monkey_king_bar"
	weight: number
	reason: string
}

const HERO_RULES: CounterRule[] = [
	{
		targetName: "npc_dota_hero_phantom_assassin",
		counterItem: "item_monkey_king_bar",
		weight: 5,
		reason: "Bypass Blur evasion"
	},
	{
		targetName: "npc_dota_hero_phantom_assassin",
		counterItem: "item_heavens_halberd",
		weight: 4,
		reason: "Disarm PA physical attacks"
	},
	{
		targetName: "npc_dota_hero_phantom_assassin",
		counterItem: "item_ghost",
		weight: 3,
		reason: "Physical immunity against PA burst"
	},
	{
		targetName: "npc_dota_hero_phantom_assassin",
		counterItem: "item_blade_mail",
		weight: 3,
		reason: "Reflect critical strikes"
	},

	{
		targetName: "npc_dota_hero_bristleback",
		counterItem: "item_silver_edge",
		weight: 5,
		reason: "Break passive damage reduction"
	},
	{
		targetName: "npc_dota_hero_bristleback",
		counterItem: "item_spirit_vessel",
		weight: 4,
		reason: "Reduce Bristleback healing/regen"
	},
	{
		targetName: "npc_dota_hero_bristleback",
		counterItem: "item_shivas_guard",
		weight: 3,
		reason: "Passive health regen reduction"
	},

	{
		targetName: "npc_dota_hero_alchemist",
		counterItem: "item_spirit_vessel",
		weight: 5,
		reason: "Counter Chemical Rage health regen"
	},
	{
		targetName: "npc_dota_hero_alchemist",
		counterItem: "item_shivas_guard",
		weight: 4,
		reason: "Reduce Alchemist healing/lifesteal"
	},
	{
		targetName: "npc_dota_hero_alchemist",
		counterItem: "item_eye_of_skadi",
		weight: 4,
		reason: "Reduce heal/regen on attack"
	},
	{
		targetName: "npc_dota_hero_alchemist",
		counterItem: "item_heavens_halberd",
		weight: 4,
		reason: "Disarm during Chemical Rage"
	},

	{
		targetName: "npc_dota_hero_huskar",
		counterItem: "item_heavens_halberd",
		weight: 5,
		reason: "Disarm fast burning spears"
	},
	{
		targetName: "npc_dota_hero_huskar",
		counterItem: "item_spirit_vessel",
		weight: 5,
		reason: "Counter low-health regen boost"
	},
	{
		targetName: "npc_dota_hero_huskar",
		counterItem: "item_silver_edge",
		weight: 4,
		reason: "Break Berserker's Blood passive"
	},
	{ targetName: "npc_dota_hero_huskar", counterItem: "item_blade_mail", weight: 3, reason: "Reflect high DPS" },

	{
		targetName: "npc_dota_hero_morphling",
		counterItem: "item_spirit_vessel",
		weight: 4,
		reason: "Reduce shift healing"
	},
	{
		targetName: "npc_dota_hero_morphling",
		counterItem: "item_sheepstick",
		weight: 5,
		reason: "Hex before attribute shift"
	},
	{
		targetName: "npc_dota_hero_morphling",
		counterItem: "item_orchid",
		weight: 4,
		reason: "Silence morph/waveform escape"
	},

	{
		targetName: "npc_dota_hero_pudge",
		counterItem: "item_spirit_vessel",
		weight: 4,
		reason: "Counter high flesh heap HP"
	},
	{
		targetName: "npc_dota_hero_pudge",
		counterItem: "item_shivas_guard",
		weight: 3,
		reason: "Reduce Pudge's regen/healing"
	},

	{
		targetName: "npc_dota_hero_spirit_breaker",
		counterItem: "item_rod_of_atos",
		weight: 4,
		reason: "Root to interrupt charge"
	},
	{ targetName: "npc_dota_hero_spirit_breaker", counterItem: "item_sheepstick", weight: 4, reason: "Hex SB charge" },

	{
		targetName: "npc_dota_hero_storm_spirit",
		counterItem: "item_orchid",
		weight: 5,
		reason: "Silence zip-zap mobility"
	},
	{
		targetName: "npc_dota_hero_storm_spirit",
		counterItem: "item_sheepstick",
		weight: 5,
		reason: "Hex storm mobility"
	},

	{
		targetName: "npc_dota_hero_weaver",
		counterItem: "item_orchid",
		weight: 5,
		reason: "Silence shukuchi/time lapse"
	},
	{ targetName: "npc_dota_hero_weaver", counterItem: "item_sheepstick", weight: 5, reason: "Hex weaver" },

	{ targetName: "npc_dota_hero_puck", counterItem: "item_orchid", weight: 5, reason: "Silence phase shift/jaunt" },
	{ targetName: "npc_dota_hero_puck", counterItem: "item_sheepstick", weight: 5, reason: "Hex puck" },

	{ targetName: "npc_dota_hero_queenofpain", counterItem: "item_orchid", weight: 4, reason: "Silence QoP blink" },
	{ targetName: "npc_dota_hero_queenofpain", counterItem: "item_sheepstick", weight: 5, reason: "Hex QoP" },

	{
		targetName: "npc_dota_hero_antimage",
		counterItem: "item_orchid",
		weight: 4,
		reason: "Silence AM blink/spellshield"
	},
	{ targetName: "npc_dota_hero_antimage", counterItem: "item_sheepstick", weight: 5, reason: "Hex AM" },

	{ targetName: "npc_dota_hero_slark", counterItem: "item_orchid", weight: 4, reason: "Silence slark escape" },
	{ targetName: "npc_dota_hero_slark", counterItem: "item_sheepstick", weight: 5, reason: "Hex slark" },

	{
		targetName: "npc_dota_hero_sven",
		counterItem: "item_heavens_halberd",
		weight: 4,
		reason: "Disarm God's Strength carry"
	},
	{
		targetName: "npc_dota_hero_sven",
		counterItem: "item_ghost",
		weight: 4,
		reason: "Physical immunity against Sven burst"
	},
	{ targetName: "npc_dota_hero_sven", counterItem: "item_force_staff", weight: 3, reason: "Kite Sven ultimate" },

	{
		targetName: "npc_dota_hero_ursa",
		counterItem: "item_heavens_halberd",
		weight: 5,
		reason: "Disarm Fury Swipes carry"
	},
	{
		targetName: "npc_dota_hero_ursa",
		counterItem: "item_ghost",
		weight: 4,
		reason: "Physical immunity against Ursa burst"
	},
	{
		targetName: "npc_dota_hero_ursa",
		counterItem: "item_force_staff",
		weight: 3,
		reason: "Kite Ursa during ultimate"
	},

	{
		targetName: "npc_dota_hero_legion_commander",
		counterItem: "item_heavens_halberd",
		weight: 4,
		reason: "Disarm during Duel"
	},
	{
		targetName: "npc_dota_hero_legion_commander",
		counterItem: "item_ghost",
		weight: 4,
		reason: "Physical immunity to survive Duel"
	},
	{
		targetName: "npc_dota_hero_legion_commander",
		counterItem: "item_blade_mail",
		weight: 3,
		reason: "Reflect Duel damage"
	},
	{
		targetName: "npc_dota_hero_legion_commander",
		counterItem: "item_linkens",
		weight: 4,
		reason: "Block Duel single-target cast"
	},

	{
		targetName: "npc_dota_hero_troll_warlord",
		counterItem: "item_heavens_halberd",
		weight: 5,
		reason: "Disarm Troll Battle Trance"
	},
	{
		targetName: "npc_dota_hero_troll_warlord",
		counterItem: "item_ghost",
		weight: 4,
		reason: "Physical immunity against Troll"
	},

	{
		targetName: "npc_dota_hero_zeus",
		counterItem: "item_black_king_bar",
		weight: 4,
		reason: "Spell immunity from Zeus spells"
	},
	{ targetName: "npc_dota_hero_zeus", counterItem: "item_pipe", weight: 4, reason: "Magic barrier for team" },
	{
		targetName: "npc_dota_hero_zeus",
		counterItem: "item_mage_slayer",
		weight: 4,
		reason: "Reduce Zeus spell damage"
	},

	{
		targetName: "npc_dota_hero_lina",
		counterItem: "item_black_king_bar",
		weight: 4,
		reason: "Spell immunity from Lina burst"
	},
	{ targetName: "npc_dota_hero_lina", counterItem: "item_pipe", weight: 3, reason: "Magic barrier from Lina burst" },
	{
		targetName: "npc_dota_hero_lina",
		counterItem: "item_mage_slayer",
		weight: 3,
		reason: "Reduce Lina spell damage"
	},

	{
		targetName: "npc_dota_hero_skywrath_mage",
		counterItem: "item_black_king_bar",
		weight: 5,
		reason: "Spell immunity to counter silence & ultimate"
	},
	{
		targetName: "npc_dota_hero_skywrath_mage",
		counterItem: "item_pipe",
		weight: 4,
		reason: "Magic barrier against high magic burst"
	},
	{
		targetName: "npc_dota_hero_skywrath_mage",
		counterItem: "item_mage_slayer",
		weight: 4,
		reason: "Reduce Skywrath spell damage"
	},

	{
		targetName: "npc_dota_hero_tinker",
		counterItem: "item_black_king_bar",
		weight: 4,
		reason: "Spell immunity from lasers/rockets"
	},
	{
		targetName: "npc_dota_hero_tinker",
		counterItem: "item_pipe",
		weight: 4,
		reason: "Magic barrier against Tinker rockets"
	},
	{
		targetName: "npc_dota_hero_tinker",
		counterItem: "item_sheepstick",
		weight: 5,
		reason: "Hex Tinker to catch and burst him"
	},

	{
		targetName: "npc_dota_hero_leshrac",
		counterItem: "item_black_king_bar",
		weight: 4,
		reason: "Spell immunity from Pulse Nova"
	},
	{
		targetName: "npc_dota_hero_leshrac",
		counterItem: "item_pipe",
		weight: 4,
		reason: "Magic barrier from Pulse Nova"
	},
	{
		targetName: "npc_dota_hero_leshrac",
		counterItem: "item_mage_slayer",
		weight: 4,
		reason: "Reduce Leshrac spell damage"
	},

	{ targetName: "npc_dota_hero_riki", counterItem: "item_dust", weight: 5, reason: "Reveal Permanent Invisibility" },
	{ targetName: "npc_dota_hero_riki", counterItem: "item_gem", weight: 4, reason: "True Sight for Riki detection" },

	{
		targetName: "npc_dota_hero_bounty_hunter",
		counterItem: "item_dust",
		weight: 5,
		reason: "Reveal Shadow Walk invis"
	},
	{
		targetName: "npc_dota_hero_bounty_hunter",
		counterItem: "item_gem",
		weight: 4,
		reason: "True Sight for BH detection"
	},

	{ targetName: "npc_dota_hero_clinkz", counterItem: "item_dust", weight: 5, reason: "Reveal Skeleton Walk invis" },
	{
		targetName: "npc_dota_hero_clinkz",
		counterItem: "item_gem",
		weight: 4,
		reason: "True Sight for Clinkz detection"
	},

	{ targetName: "npc_dota_hero_nyx_assassin", counterItem: "item_dust", weight: 5, reason: "Reveal Vendetta invis" },
	{
		targetName: "npc_dota_hero_nyx_assassin",
		counterItem: "item_gem",
		weight: 4,
		reason: "True Sight for Nyx detection"
	},

	{
		targetName: "npc_dota_hero_enigma",
		counterItem: "item_aeon_disk",
		weight: 4,
		reason: "Survive Black Hole initiation"
	},
	{
		targetName: "npc_dota_hero_enigma",
		counterItem: "item_sheepstick",
		weight: 4,
		reason: "Hex Enigma before Black Hole"
	},

	{
		targetName: "npc_dota_hero_faceless_void",
		counterItem: "item_aeon_disk",
		weight: 5,
		reason: "Survive Chronosphere initiation"
	},

	{
		targetName: "npc_dota_hero_warlock",
		counterItem: "item_pipe",
		weight: 3,
		reason: "Magic barrier from Fatal Bonds"
	},

	{
		targetName: "npc_dota_hero_tidehunter",
		counterItem: "item_aeon_disk",
		weight: 3,
		reason: "Survive Ravage initiation"
	}
]

const ITEM_RULES: CounterRule[] = [
	{
		targetName: "item_butterfly",
		counterItem: "item_monkey_king_bar",
		weight: 5,
		reason: "Bypass Butterfly's evasion"
	},
	{
		targetName: "item_butterfly",
		counterItem: "item_bloodthorn",
		weight: 4,
		reason: "True strike with Bloodthorn active"
	},

	{
		targetName: "item_solar_crest",
		counterItem: "item_monkey_king_bar",
		weight: 3,
		reason: "Bypass Solar Crest evasion"
	},

	{
		targetName: "item_ghost",
		counterItem: "item_nullifier",
		weight: 5,
		reason: "Purge Ghost Scepter physical immunity"
	},

	{
		targetName: "item_aeon_disk",
		counterItem: "item_nullifier",
		weight: 5,
		reason: "Purge Aeon Disk invulnerability"
	},

	{
		targetName: "item_glimmer_cape",
		counterItem: "item_nullifier",
		weight: 4,
		reason: "Purge Glimmer barrier and invis"
	},
	{ targetName: "item_glimmer_cape", counterItem: "item_dust", weight: 3, reason: "Reveal Glimmer invis" },

	{ targetName: "item_force_staff", counterItem: "item_nullifier", weight: 3, reason: "Purge force push movement" },
	{
		targetName: "item_hurricane_pike",
		counterItem: "item_nullifier",
		weight: 3,
		reason: "Purge force push movement"
	},

	{
		targetName: "item_crimson_guard",
		counterItem: "item_nullifier",
		weight: 3,
		reason: "Purge active guard block buff"
	},

	{ targetName: "item_pipe", counterItem: "item_nullifier", weight: 3, reason: "Purge Pipe magic barrier buff" },

	{
		targetName: "item_satanic",
		counterItem: "item_spirit_vessel",
		weight: 4,
		reason: "Reduce Satanic's lifesteal rate"
	},
	{
		targetName: "item_satanic",
		counterItem: "item_eye_of_skadi",
		weight: 4,
		reason: "Reduce Satanic's lifesteal on hit"
	},
	{
		targetName: "item_satanic",
		counterItem: "item_shivas_guard",
		weight: 4,
		reason: "Passively reduce Satanic's lifesteal"
	},
	{
		targetName: "item_satanic",
		counterItem: "item_heavens_halberd",
		weight: 4,
		reason: "Disarm during Satanic lifesteal"
	},

	{
		targetName: "item_heart",
		counterItem: "item_spirit_vessel",
		weight: 4,
		reason: "Counter Heart of Tarrasque regen"
	},
	{
		targetName: "item_heart",
		counterItem: "item_eye_of_skadi",
		weight: 3,
		reason: "Reduce Heart of Tarrasque regen"
	},
	{
		targetName: "item_heart",
		counterItem: "item_shivas_guard",
		weight: 3,
		reason: "Reduce Heart of Tarrasque regen"
	},

	{
		targetName: "item_bloodstone",
		counterItem: "item_spirit_vessel",
		weight: 4,
		reason: "Counter Bloodstone spell lifesteal"
	},
	{
		targetName: "item_bloodstone",
		counterItem: "item_eye_of_skadi",
		weight: 3,
		reason: "Reduce Bloodstone spell lifesteal"
	},
	{
		targetName: "item_bloodstone",
		counterItem: "item_shivas_guard",
		weight: 3,
		reason: "Reduce Bloodstone spell lifesteal"
	},

	{ targetName: "item_radiance", counterItem: "item_pipe", weight: 3, reason: "Block Radiance aura magic damage" },
	{
		targetName: "item_radiance",
		counterItem: "item_monkey_king_bar",
		weight: 3,
		reason: "Bypass Radiance blind miss chance"
	},
	{ targetName: "item_radiance", counterItem: "item_mage_slayer", weight: 3, reason: "Reduce Radiance burn damage" },

	{ targetName: "item_invis_sword", counterItem: "item_dust", weight: 4, reason: "Reveal Shadow Blade invis" },
	{ targetName: "item_invis_sword", counterItem: "item_gem", weight: 3, reason: "True sight detection for invis" },
	{ targetName: "item_silver_edge", counterItem: "item_dust", weight: 4, reason: "Reveal Silver Edge invis" },
	{ targetName: "item_silver_edge", counterItem: "item_gem", weight: 3, reason: "True sight detection for invis" },

	{
		targetName: "item_black_king_bar",
		counterItem: "item_abyssal_blade",
		weight: 4,
		reason: "Stun through BKB active"
	},
	{ targetName: "item_black_king_bar", counterItem: "item_ghost", weight: 3, reason: "Survive physical BKB carry" },
	{ targetName: "item_black_king_bar", counterItem: "item_force_staff", weight: 3, reason: "Kite BKB carry" },

	{ targetName: "item_blink", counterItem: "item_urn_of_shadows", weight: 2, reason: "DoT damage to cancel Blink" },
	{ targetName: "item_blink", counterItem: "item_spirit_vessel", weight: 2, reason: "DoT damage to cancel Blink" },
	{ targetName: "item_blink", counterItem: "item_radiance", weight: 2, reason: "Burn aura to cancel Blink" },
	{
		targetName: "item_blink_dagger",
		counterItem: "item_urn_of_shadows",
		weight: 2,
		reason: "DoT damage to cancel Blink"
	},
	{
		targetName: "item_blink_dagger",
		counterItem: "item_spirit_vessel",
		weight: 2,
		reason: "DoT damage to cancel Blink"
	},
	{ targetName: "item_blink_dagger", counterItem: "item_radiance", weight: 2, reason: "Burn aura to cancel Blink" }
]

const ITEM_DISPLAY_NAMES: Record<string, string> = {
	item_monkey_king_bar: "Monkey King Bar",
	item_heavens_halberd: "Heaven's Halberd",
	item_ghost: "Ghost Scepter",
	item_blade_mail: "Blade Mail",
	item_silver_edge: "Silver Edge",
	item_spirit_vessel: "Spirit Vessel",
	item_shivas_guard: "Shiva's Guard",
	item_eye_of_skadi: "Eye of Skadi",
	item_sheepstick: "Scythe of Vyse",
	item_orchid: "Orchid Malevolence",
	item_bloodthorn: "Bloodthorn",
	item_rod_of_atos: "Rod of Atos",
	item_force_staff: "Force Staff",
	item_hurricane_pike: "Hurricane Pike",
	item_linkens: "Linken's Sphere",
	item_black_king_bar: "Black King Bar",
	item_pipe: "Pipe of Insight",
	item_mage_slayer: "Mage Slayer",
	item_glimmer_cape: "Glimmer Cape",
	item_dust: "Dust of Appearance",
	item_gem: "Gem of True Sight",
	item_aeon_disk: "Aeon Disk",
	item_nullifier: "Nullifier",
	item_abyssal_blade: "Abyssal Blade",
	item_urn_of_shadows: "Urn of Shadows",
	item_radiance: "Radiance"
}

function getHeroNameClean(rawName: string): string {
	return rawName
		.replace("npc_dota_hero_", "")
		.split("_")
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ")
}

class CounterItemsUtility {
	private readonly entry = Menu.AddEntry("Byteseeker")
	private readonly node = this.entry.AddNode("Utility").AddNode("Counter Items")
	private readonly enabled = this.node.AddToggle("Enabled", true)
	private readonly posX = this.node.AddSlider("Position X", 1600, 0, 3840)
	private readonly posY = this.node.AddSlider("Position Y", 250, 0, 2160)
	private readonly scale = this.node.AddSlider("UI Scale (%)", 100, 50, 200)
	private readonly bgAlpha = this.node.AddSlider("Background Alpha", 180, 0, 255)
	private readonly showReasons = this.node.AddToggle("Show Reasons", true)
	private readonly maxRecommendations = this.node.AddSlider("Max Recommendations", 5, 1, 8)

	constructor() {
		EventsSDK.on("Draw", this.onDraw.bind(this))
	}

	private get hasLocalHero(): boolean {
		return LocalPlayer?.Hero !== undefined
	}

	private onDraw(): void {
		if (!this.enabled.value || !this.hasLocalHero || ExecuteOrder.DisableHumanizer) {
			return
		}

		const localHero = LocalPlayer?.Hero
		if (localHero === undefined || !localHero.IsValid || !localHero.IsAlive) {
			return
		}

		// Calculate counter scores
		const scores: Record<string, { score: number; reasons: { hero: string; text: string }[] }> = {}

		// Initialize scores
		for (const key of Object.keys(ITEM_DISPLAY_NAMES)) {
			scores[key] = { score: 0, reasons: [] }
		}

		let enemiesCount = 0

		for (const entity of EntityManager.GetEntitiesByClass(Hero)) {
			if (
				!entity.IsValid ||
				!entity.IsAlive ||
				!entity.IsEnemy(localHero) ||
				entity.IsIllusion ||
				!entity.IsRealHero
			) {
				continue
			}

			enemiesCount++
			const cleanName = getHeroNameClean(entity.Name)

			// 1. Check Hero Rules
			for (const rule of HERO_RULES) {
				if (rule.targetName === entity.Name) {
					const itemKey = rule.counterItem
					if (scores[itemKey]) {
						scores[itemKey].score += rule.weight
						scores[itemKey].reasons.push({
							hero: cleanName,
							text: rule.reason
						})
					}
				}
			}

			// 2. Check Item Rules based on enemy inventory
			for (const item of entity.Items) {
				if (item !== undefined && item.IsValid) {
					for (const rule of ITEM_RULES) {
						if (rule.targetName === item.Name) {
							const itemKey = rule.counterItem
							if (scores[itemKey]) {
								scores[itemKey].score += rule.weight
								scores[itemKey].reasons.push({
									hero: cleanName,
									text: rule.reason
								})
							}
						}
					}
				}
			}
		}

		// Don't draw if there are no enemies found in game yet
		if (enemiesCount === 0) {
			return
		}

		// 3. Adjust scores based on Local Hero role
		const primaryAttr = localHero.PrimaryAttribute
		for (const key of Object.keys(scores)) {
			// If local hero already has the item, set score to 0
			if (localHero.Inventory.HasItemInInventory(key, true)) {
				scores[key].score = 0
				continue
			}

			if (primaryAttr === Attributes.DOTA_ATTRIBUTE_INTELLECT) {
				if (
					key === "item_sheepstick" ||
					key === "item_orchid" ||
					key === "item_bloodthorn" ||
					key === "item_ghost" ||
					key === "item_glimmer_cape" ||
					key === "item_force_staff" ||
					key === "item_pipe" ||
					key === "item_spirit_vessel"
				) {
					scores[key].score += 1.5
				}
				if (key === "item_monkey_king_bar" || key === "item_silver_edge" || key === "item_abyssal_blade") {
					scores[key].score -= 3.0
				}
			} else if (primaryAttr === Attributes.DOTA_ATTRIBUTE_AGILITY) {
				if (
					key === "item_monkey_king_bar" ||
					key === "item_silver_edge" ||
					key === "item_eye_of_skadi" ||
					key === "item_bloodthorn" ||
					key === "item_black_king_bar" ||
					key === "item_abyssal_blade"
				) {
					scores[key].score += 1.5
				}
				if (key === "item_ghost" || key === "item_glimmer_cape" || key === "item_force_staff") {
					scores[key].score -= 3.0
				}
			} else if (primaryAttr === Attributes.DOTA_ATTRIBUTE_STRENGTH) {
				if (
					key === "item_heavens_halberd" ||
					key === "item_shivas_guard" ||
					key === "item_blade_mail" ||
					key === "item_pipe" ||
					key === "item_black_king_bar" ||
					key === "item_abyssal_blade"
				) {
					scores[key].score += 1.5
				}
				if (key === "item_ghost") {
					scores[key].score -= 2.0
				}
			}
		}

		// Filter and sort items with positive scores
		const topSuggestions = Object.keys(scores)
			.map(key => ({
				key,
				name: ITEM_DISPLAY_NAMES[key],
				score: scores[key].score,
				reasons: scores[key].reasons
			}))
			.filter(item => item.score > 0.1)
			.sort((a, b) => b.score - a.score)
			.slice(0, this.maxRecommendations.value)

		if (topSuggestions.length === 0) {
			return
		}

		// Draw HUD Panel
		const scaleVal = this.scale.value / 100
		const x = this.posX.value
		const y = this.posY.value
		const showReasons = this.showReasons.value

		const width = showReasons ? Math.round(550 * scaleVal) : Math.round(300 * scaleVal)
		const headerHeight = Math.round(34 * scaleVal)
		const itemHeight = showReasons ? Math.round(48 * scaleVal) : Math.round(34 * scaleVal)
		const totalHeight = headerHeight + topSuggestions.length * itemHeight + Math.round(6 * scaleVal)

		const font = "PTSans"
		const bgCol = Color.Black.SetA(this.bgAlpha.value)
		const borderCol = Color.RoyalBlue.SetA(180)

		// 1. Draw Background & Border
		RendererSDK.FilledRect(new Vector2(x, y), new Vector2(width, totalHeight), bgCol)
		RendererSDK.OutlinedRect(new Vector2(x, y), new Vector2(width, totalHeight), 1, borderCol)

		// 2. Draw Header
		const headerText = "Counter Items"
		const headerFontSize = Math.round(13 * scaleVal)
		const textSz = RendererSDK.GetTextSize(headerText, font, headerFontSize, 700)
		const headerTextPos = new Vector2(x + (width - textSz.x) / 2, y + Math.round(8 * scaleVal))
		RendererSDK.Text(headerText, headerTextPos, Color.Aqua, font, headerFontSize, 700, false, true)

		// 3. Draw Header Underline/Divider
		const dividerY = y + headerHeight - 1
		RendererSDK.Line(
			new Vector2(x + Math.round(8 * scaleVal), dividerY),
			new Vector2(x + width - Math.round(8 * scaleVal), dividerY),
			Color.LightGray.SetA(80),
			1
		)

		// 3b. Draw Vertical Divider (only if showReasons is true)
		if (showReasons) {
			const verticalDividerX = x + Math.round(240 * scaleVal)
			RendererSDK.Line(
				new Vector2(verticalDividerX, y + headerHeight + Math.round(4 * scaleVal)),
				new Vector2(verticalDividerX, y + totalHeight - Math.round(8 * scaleVal)),
				Color.LightGray.SetA(50),
				1
			)
		}

		// 4. Draw Suggested Items
		let currentY = y + headerHeight + Math.round(4 * scaleVal)
		const itemFontSize = Math.round(11 * scaleVal)
		const reasonFontSize = Math.round(9 * scaleVal)

		for (let i = 0; i < topSuggestions.length; i++) {
			const suggestion = topSuggestions[i]
			const itemIndex = i + 1
			const texturePath = ImageData.GetItemTexture(suggestion.key)
			const iconSize = new Vector2(Math.round(36 * scaleVal), Math.round(25 * scaleVal))

			// Draw index number
			const numberText = `${itemIndex}.`
			const numberX = x + Math.round(10 * scaleVal)
			const numberY = showReasons
				? currentY + Math.round((itemHeight - 11 * scaleVal) / 2)
				: currentY + Math.round(8 * scaleVal)
			RendererSDK.Text(
				numberText,
				new Vector2(numberX, numberY),
				Color.LightGray.SetA(220),
				font,
				itemFontSize,
				600,
				false,
				true
			)

			// Draw item icon
			const iconPos = new Vector2(
				x + Math.round(28 * scaleVal),
				currentY + Math.round((itemHeight - iconSize.y) / 2)
			)
			if (texturePath !== "") {
				RendererSDK.Image(texturePath, iconPos, -1, iconSize)
			} else {
				// Fallback colored rect if image doesn't exist
				RendererSDK.FilledRect(iconPos, iconSize, Color.Gray.SetA(150))
			}

			// Draw item name
			const nameX = x + Math.round(72 * scaleVal)
			const nameY = showReasons
				? currentY + Math.round((itemHeight - 11 * scaleVal) / 2)
				: currentY + Math.round(8 * scaleVal)
			RendererSDK.Text(
				suggestion.name,
				new Vector2(nameX, nameY),
				Color.White,
				font,
				itemFontSize,
				600,
				false,
				true
			)

			// Draw reasons to the right
			if (showReasons && suggestion.reasons.length > 0) {
				const reasonsToShow = suggestion.reasons.slice(0, 2)
				const reasonX = x + Math.round(252 * scaleVal)

				if (reasonsToShow.length === 1) {
					const reason = reasonsToShow[0]
					const reasonY = currentY + Math.round((itemHeight - 9 * scaleVal) / 2)
					const heroText = `${reason.hero}: `
					const heroTextWidth = RendererSDK.GetTextSize(heroText, font, reasonFontSize, 600, false).x

					RendererSDK.Text(
						heroText,
						new Vector2(reasonX, reasonY),
						Color.Yellow,
						font,
						reasonFontSize,
						600,
						false,
						true
					)
					RendererSDK.Text(
						reason.text,
						new Vector2(reasonX + heroTextWidth, reasonY),
						Color.LightGray.SetA(220),
						font,
						reasonFontSize,
						400,
						false,
						true
					)
				} else if (reasonsToShow.length >= 2) {
					const reason1 = reasonsToShow[0]
					const reason2 = reasonsToShow[1]

					const reason1Y = currentY + Math.round(6 * scaleVal)
					const reason2Y = currentY + Math.round(24 * scaleVal)

					// Reason 1
					const heroText1 = `${reason1.hero}: `
					const heroTextWidth1 = RendererSDK.GetTextSize(heroText1, font, reasonFontSize, 600, false).x
					RendererSDK.Text(
						heroText1,
						new Vector2(reasonX, reason1Y),
						Color.Yellow,
						font,
						reasonFontSize,
						600,
						false,
						true
					)
					RendererSDK.Text(
						reason1.text,
						new Vector2(reasonX + heroTextWidth1, reason1Y),
						Color.LightGray.SetA(220),
						font,
						reasonFontSize,
						400,
						false,
						true
					)

					// Reason 2
					const heroText2 = `${reason2.hero}: `
					const heroTextWidth2 = RendererSDK.GetTextSize(heroText2, font, reasonFontSize, 600, false).x
					RendererSDK.Text(
						heroText2,
						new Vector2(reasonX, reason2Y),
						Color.Yellow,
						font,
						reasonFontSize,
						600,
						false,
						true
					)
					RendererSDK.Text(
						reason2.text,
						new Vector2(reasonX + heroTextWidth2, reason2Y),
						Color.LightGray.SetA(220),
						font,
						reasonFontSize,
						400,
						false,
						true
					)
				}
			}

			currentY += itemHeight
		}
	}
}

new CounterItemsUtility()

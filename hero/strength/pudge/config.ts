import { ImageData, Menu } from "github.com/octarine-public/wrapper/index"

const getAssetPath = (relativePath: string): string => {
	const stack = new Error().stack
	const fallback = `github.com/byte-seeker/byteseeker-script-octarine/scripts_files/${relativePath}`
	if (!stack) {
		return fallback
	}
	const lines = stack.split("\n")
	const callerLine = lines[2] || ""
	const match = /^\s{4}at\s(?:.+\s\()?(.+):\d+:\d+(?:\))?$/.exec(callerLine)
	if (!match) {
		return fallback
	}
	const callerFile = match[1].replace(/\\/g, "/")
	const parts = callerFile.split("/")
	parts.pop() // remove filename
	while (parts.length > 0) {
		const checkPath = `${parts.join("/")}/scripts_files/${relativePath}`
		if (fexists(checkPath)) {
			const githubIdx = checkPath.indexOf("github.com/")
			if (githubIdx !== -1) {
				return checkPath.substring(githubIdx)
			}
			const repoIdx = checkPath.indexOf("byteseeker-script-octarine/scripts_files/")
			if (repoIdx !== -1) {
				return `github.com/byte-seeker/${checkPath.substring(repoIdx)}`
			}
			return checkPath
		}
		parts.pop()
	}
	return fallback
}

export const PudgeConfig = new (class {
	public readonly entry = Menu.AddEntry("Byteseeker", getAssetPath("icons/logo_byteseeker_no_bg60px.png"))
		.AddNode("Hero", ImageData.GetHeroTexture("npc_dota_hero_pudge", true))
		.AddNode("Strength", ImageData.Icons.primary_attribute_strength)
		.AddNode("Pudge", ImageData.GetHeroTexture("npc_dota_hero_pudge"))

	public readonly comboEnabled = this.entry.AddToggle("Enable Combo", true)
	public readonly comboKey = this.entry.AddKeybind("Combo Key", "G", "Hold to execute combo")
	public readonly comboRadius = this.entry.AddSlider("Target Search Radius", 800, 300, 1500)
	public readonly orbWalkEnabled = this.entry.AddToggle("Enable Smart Orb Walk", true)
	public readonly orbWalkDist = this.entry.AddSlider("Orb Walk Safe Distance %", 80, 10, 100)
	public readonly orbWalkStop = this.entry.AddToggle("Stop-to-Cancel Backswing", false)

	public readonly hookNode = this.entry.AddNode("Hook Settings", ImageData.GetSpellTexture("pudge_meat_hook"))
	public readonly collisionCheck = this.hookNode.AddToggle("Check Collision (Creeps)", true)
	public readonly predBufMs = this.hookNode.AddSlider(
		"Latency Buffer (ms)",
		50,
		0,
		200,
		0,
		"Added on top of physics intercept for server latency"
	)
	public readonly requireStable = this.hookNode.AddToggle(
		"Require Direction Stability",
		true,
		"Observe 0.45s enemy movement before firing hook"
	)
	public readonly cancelEnabled = this.hookNode.AddToggle(
		"Smart Hook Cancel",
		true,
		"Cancel hook if target blinks, goes invisible, becomes immune, or is blocked during cast windup"
	)
	public readonly cancelOnImmune = this.hookNode.AddToggle(
		"Cancel on Magic/Debuff Immune",
		false,
		"Cancel hook if target becomes spell/debuff immune during cast windup"
	)
	public readonly cancelOnInvisible = this.hookNode.AddToggle(
		"Cancel on Invisible/Fog",
		false,
		"Cancel hook if target goes invisible or enters Fog of War during cast windup"
	)
	public readonly cancelOnEul = this.hookNode.AddToggle(
		"Cancel on Eul/Cyclone",
		true,
		"Cancel hook if target is cycloned (Eul/Windwaker) during cast windup"
	)
	public readonly cancelOnBlink = this.hookNode.AddToggle(
		"Cancel on Blink/Teleport",
		true,
		"Cancel hook if target blinks or teleports during cast windup"
	)
	public readonly autoKsEnabled = this.hookNode.AddToggle(
		"Auto KS with Hook",
		true,
		"Automatically hook enemies if their HP is low enough to die"
	)
	public readonly stableThreshDeg = this.hookNode.AddSlider(
		"Stability Threshold (deg)",
		5,
		0,
		60,
		0,
		"Max direction deviation to consider movement stable"
	)

	public readonly rotEnabled = this.entry.AddToggle("Auto Rot", true)

	public readonly meatShieldNode = this.entry.AddNode(
		"Auto Meat Shield",
		ImageData.GetSpellTexture("pudge_flesh_heap")
	)
	public readonly meatShieldEnabled = this.meatShieldNode.AddToggle(
		"Enabled",
		true,
		"Auto use Meat Shield (Flesh Heap) to block incoming damage"
	)
	public readonly meatShieldOnProjectile = this.meatShieldNode.AddToggle(
		"On Incoming Projectile",
		true,
		"Activate when an incoming spell or hero attack projectile is detected"
	)
	public readonly meatShieldOnHpDrop = this.meatShieldNode.AddToggle(
		"On HP Drop (Burst)",
		true,
		"Activate when Pudge HP drops quickly"
	)
	public readonly meatShieldHpThreshold = this.meatShieldNode.AddSlider(
		"HP Drop Threshold",
		150,
		50,
		500,
		10,
		"Minimum HP drop in a single frame to activate"
	)
	public meatShieldTriggers!: Menu.DynamicImageSelector

	public readonly dismemberNode = this.entry.AddNode("Auto Dismember", ImageData.GetSpellTexture("pudge_dismember"))
	public readonly dismemberEnabled = this.dismemberNode.AddToggle("Enabled", true)

	public readonly autoHookNode = this.entry.AddNode(
		"Auto Hook (Background)",
		ImageData.GetSpellTexture("pudge_meat_hook"),
		"Automatically cast Hook in the background on vulnerable, channeled, or stable targets without holding the combo key"
	)
	public readonly autoHookEnabled = this.autoHookNode.AddToggle("Enabled", false)
	public readonly autoHookMinDist = this.autoHookNode.AddSlider("Min Distance", 200, 0, 600)

	public readonly farmNode = this.entry.AddNode("Auto Farm (Rot)", ImageData.GetSpellTexture("pudge_rot"))
	public readonly farmEnabled = this.farmNode.AddToggle("Enabled", false, "Auto toggle Rot to farm nearby creeps")
	public readonly farmSafeHpPct = this.farmNode.AddSlider(
		"Safe HP %",
		40,
		10,
		80,
		0,
		"Turn off Rot if Pudge HP drops below this %"
	)
	public readonly farmCreepHpPct = this.farmNode.AddSlider(
		"Creep HP Threshold %",
		10,
		1,
		100,
		0,
		"Minimum creep HP % to activate Rot"
	)
	public readonly farmMoveToWave = this.farmNode.AddToggle(
		"Move to Nearest Creep",
		false,
		"Walk toward nearest creep if none in Rot range"
	)

	public readonly espNode = this.entry.AddNode("ESP")
	public readonly espRangeCircle = this.espNode.AddToggle("Show Hook Range Circle", true)
	public readonly espHookLine = this.espNode.AddToggle("Show Hook Trajectory", true)
	public readonly espRangeLabel = this.espNode.AddToggle("Show Range Labels", true)
	public readonly espApproachSec = this.espNode.AddSlider("Approach Warning (sec)", 2, 1, 5, 1)
	public readonly espShowBlockers = this.espNode.AddToggle(
		"Highlight Blockers",
		true,
		"Highlight creeps or heroes blocking the hook trajectory in red"
	)

	public comboSequenceGrid: any

	constructor() {
		const shieldDef = new Map<string, [boolean, boolean, boolean, number]>()
		shieldDef.set("zuus_thundergods_wrath", [true, true, true, 0])
		shieldDef.set("lina_laguna_blade", [true, true, true, 1])
		shieldDef.set("lion_finger_of_death", [true, true, true, 2])

		this.meatShieldTriggers = this.meatShieldNode.AddDynamicImageSelector(
			"Triggers (Zeus Ult / Lina Ult / Lion Ult)",
			["zuus_thundergods_wrath", "lina_laguna_blade", "lion_finger_of_death"],
			shieldDef
		)

		this.reinitGrids()
	}

	public reinitGrids(): void {
		const def = new Map<string, [boolean, boolean, boolean, number]>()
		def.set("pudge_meat_hook", [true, true, true, 0])
		def.set("pudge_rot", [true, true, true, 1])
		def.set("pudge_dismember", [true, true, true, 2])
		this.comboSequenceGrid = this.entry.AddDynamicImageSelector(
			"Combo Order",
			["pudge_meat_hook", "pudge_rot", "pudge_dismember"],
			def
		)
	}
})()

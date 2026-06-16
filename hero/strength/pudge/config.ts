import { Menu } from "github.com/octarine-public/wrapper/index"

export const PudgeConfig = new (class {
	public readonly entry = Menu.AddEntry("Byteseeker").AddNode("Hero").AddNode("Strength").AddNode("Pudge")

	public readonly comboEnabled = this.entry.AddToggle("Enable Combo", true)
	public readonly comboKey = this.entry.AddKeybind("Combo Key", "G", "Hold to execute combo")
	public readonly comboRadius = this.entry.AddSlider("Target Search Radius", 800, 300, 1500)
	public readonly orbWalkEnabled = this.entry.AddToggle("Enable Smart Orb Walk", true)
	public readonly orbWalkDist = this.entry.AddSlider("Orb Walk Safe Distance %", 80, 10, 100)
	public readonly orbWalkStop = this.entry.AddToggle("Stop-to-Cancel Backswing", false)

	public readonly hookNode = this.entry.AddNode("Hook Settings")
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
		"Observe 0.3s enemy movement before firing hook"
	)
	public readonly autoKsEnabled = this.hookNode.AddToggle(
		"Auto KS with Hook",
		true,
		"Automatically hook enemies if their HP is low enough to die"
	)
	public readonly stableThreshDeg = this.hookNode.AddSlider(
		"Stability Threshold (deg)",
		25,
		5,
		60,
		0,
		"Max direction deviation to consider movement stable"
	)

	public readonly rotEnabled = this.entry.AddToggle("Auto Rot", true)

	public readonly dismemberNode = this.entry.AddNode("Auto Dismember")
	public readonly dismemberEnabled = this.dismemberNode.AddToggle("Enabled", true)

	public readonly autoHookNode = this.entry.AddNode("Auto Hook (Background)")
	public readonly autoHookEnabled = this.autoHookNode.AddToggle("Enabled", false)
	public readonly autoHookMinDist = this.autoHookNode.AddSlider("Min Distance", 200, 0, 600)

	public readonly farmNode = this.entry.AddNode("Auto Farm (Rot)")
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
		true,
		"Walk toward nearest creep if none in Rot range"
	)

	public readonly espNode = this.entry.AddNode("ESP")
	public readonly espRangeCircle = this.espNode.AddToggle("Show Hook Range Circle", true)
	public readonly espHookLine = this.espNode.AddToggle("Show Hook Trajectory", true)
	public readonly espRangeLabel = this.espNode.AddToggle("Show Range Labels", true)
	public readonly espApproachSec = this.espNode.AddSlider("Approach Warning (sec)", 2, 1, 5, 1)

	public comboSequenceGrid: any

	constructor() {
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

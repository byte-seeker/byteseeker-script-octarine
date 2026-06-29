import {
	Color,
	EventsSDK,
	ExecuteOrder,
	ImageData,
	LocalPlayer,
	Menu,
	PARTICLE_RENDER,
	ParticleAttachment,
	ParticlesSDK
} from "github.com/octarine-public/wrapper/index"

class RadiusUtility {
	private readonly entry = Menu.AddEntry("Byteseeker")
	private readonly node = this.entry.AddNode("Utility").AddNode("Radius", ImageData.Icons.icon_svg_tower)
	private readonly enabled = this.node.AddToggle("Enable Radius Script", true)
	private readonly rangeStyle = this.node.AddDropdown("Style", ["Normal", "Rope"], 0)
	private readonly color = this.node.AddColorPicker("Color", Color.Aqua.SetA(180))

	private readonly particles = new ParticlesSDK()
	private particleCreated = false
	private lastRange = -1
	private lastStyle = -1
	private lastColorHex = ""

	constructor() {
		EventsSDK.on("PostDataUpdate", this.PostDataUpdate.bind(this))
		EventsSDK.on("GameEnded", this.GameEnded.bind(this))

		this.enabled.OnValue(() => this.updateState())
		this.rangeStyle.OnValue(() => this.updateState())
		this.color.OnValue(() => this.updateState())
	}

	private get hasLocalHero(): boolean {
		return LocalPlayer?.Hero !== undefined
	}

	private updateState(): void {
		if (!this.hasLocalHero || !this.enabled.value || ExecuteOrder.DisableHumanizer) {
			this.clearParticles()
		}
	}

	private PostDataUpdate(delta: number): void {
		if (delta === 0 || !this.hasLocalHero || ExecuteOrder.DisableHumanizer) {
			this.clearParticles()
			return
		}

		const hero = LocalPlayer?.Hero
		if (hero === undefined || !hero.IsValid || !hero.IsAlive) {
			this.clearParticles()
			return
		}

		const isEnabled = this.enabled.value && !this.enabled.IsHidden
		if (!isEnabled) {
			this.clearParticles()
			return
		}

		const range = hero.GetAttackRange()
		const style = this.rangeStyle.SelectedID === 1 ? PARTICLE_RENDER.ROPE : PARTICLE_RENDER.NORMAL
		const particleColor = this.color.SelectedColor
		const colorHex = JSON.stringify(particleColor)

		if (
			this.particleCreated &&
			this.lastRange === range &&
			this.lastStyle === style &&
			this.lastColorHex === colorHex
		) {
			return
		}

		this.particles.DrawCircle("byteseeker_attack_range", hero, range, {
			RenderStyle: style,
			Color: particleColor,
			Attachment: ParticleAttachment.PATTACH_ABSORIGIN_FOLLOW
		})

		this.particleCreated = true
		this.lastRange = range
		this.lastStyle = style
		this.lastColorHex = colorHex
	}

	private clearParticles(): void {
		if (this.particleCreated) {
			this.particles.DestroyByKey("byteseeker_attack_range")
			this.particleCreated = false
			this.lastRange = -1
			this.lastStyle = -1
			this.lastColorHex = ""
		}
	}

	private GameEnded(): void {
		this.clearParticles()
	}
}

new RadiusUtility()

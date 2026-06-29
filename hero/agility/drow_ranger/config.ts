import { ImageData, Menu } from "github.com/octarine-public/wrapper/index"

import { getAssetPath } from "../../../utility/asset"

export const DrowRangerConfig = new (class {
	public readonly entry = Menu.AddEntry("Byteseeker", getAssetPath("icons/logo_byteseeker_no_bg60px.png"))
		.AddNode("Hero", ImageData.Icons.icon_svg_alien)
		.AddNode("Agility", ImageData.Icons.primary_attribute_agility)
		.AddNode("Drow Ranger", ImageData.GetHeroTexture("npc_dota_hero_drow_ranger", true))

	public readonly autoFrostArrowsNode = this.entry.AddNode(
		"Auto Frost Arrows",
		ImageData.GetSpellTexture("drow_ranger_frost_arrows")
	)
	public readonly autoFrostArrowsEnabled = this.autoFrostArrowsNode.AddToggle(
		"Enabled",
		false,
		"Auto-cast Frost Arrows when attacking enemy heroes"
	)

	constructor() {
		// Initialization
	}
})()

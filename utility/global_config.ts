import { ImageData, Menu } from "github.com/octarine-public/wrapper/index"

import { getAssetPath } from "./asset"

export const GlobalConfig = new (class {
	public readonly entry = Menu.AddEntry("Byteseeker", getAssetPath("icons/logo_byteseeker_no_bg60px.png"))
	public readonly heroesNode = this.entry.AddNode("Heroes", ImageData.Icons.icon_svg_alien)
	public readonly heroesEnabled = this.heroesNode.AddToggle("Enable All Heroes Script", true)
})()

import { Menu } from "github.com/octarine-public/wrapper/index"

import { getAssetPath } from "./asset"

export const GlobalComboKey = Menu.AddEntry(
	"Byteseeker",
	getAssetPath("icons/logo_byteseeker_no_bg60px.png")
).AddKeybind("Combo Key", "G", "Hold to execute combo")

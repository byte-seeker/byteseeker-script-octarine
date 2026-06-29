export const getAssetPath = (relativePath: string): string => {
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

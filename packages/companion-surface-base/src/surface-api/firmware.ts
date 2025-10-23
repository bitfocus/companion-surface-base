export interface SurfaceFirmwareUpdateInfo {
	/**
	 * URL to direct the user towards for performing the update
	 */
	updateUrl: string
}

export interface SurfaceFirmwareUpdateCache {
	/**
	 * Fetch a json resource from the given URL. Calls will be cached between different surfaces
	 * @param url
	 */
	fetchJson(url: string): Promise<any>
}

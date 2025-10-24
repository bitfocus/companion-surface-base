import { createModuleLogger } from './main.js'
import type { SurfaceProxy } from './surfaceProxy.js'
import type { SurfaceFirmwareUpdateCache, SurfaceFirmwareUpdateInfo } from '@companion-surface/base'

const FIRMWARE_UPDATE_POLL_INTERVAL = 1000 * 60 * 60 * 24 // 24 hours
const FIRMWARE_PAYLOAD_CACHE_TTL = 1000 * 60 * 60 * 4 // 4 hours
const FIRMWARE_PAYLOAD_CACHE_MAX_TTL = 1000 * 60 * 60 * 24 // 24 hours

export class FirmwareUpdateCheck {
	readonly #logger = createModuleLogger('FirmwareUpdateCheck')

	#versionsCache: SurfaceFirmwareUpdateCacheImpl | null = null

	/**
	 * All the opened and active surfaces
	 */
	readonly #surfaceHandlers: Map<string, SurfaceProxy | null>

	readonly #emitChange: (surfaceId: string, updateInfo: SurfaceFirmwareUpdateInfo | null) => void

	constructor(
		surfaceHandlers: Map<string, SurfaceProxy | null>,
		emitChange: (surfaceId: string, updateInfo: SurfaceFirmwareUpdateInfo | null) => void,
	) {
		this.#surfaceHandlers = surfaceHandlers
		this.#emitChange = emitChange

		setInterval(() => this.#checkAllSurfacesForUpdates(), FIRMWARE_UPDATE_POLL_INTERVAL)
		setTimeout(() => this.#checkAllSurfacesForUpdates(), 5000)
	}

	#checkAllSurfacesForUpdates() {
		if (this.#surfaceHandlers.size === 0) return

		this.#logger.debug(`Checking for firmware updates for ${this.#surfaceHandlers.size} surfaces`)

		// Check if the cache is too old to be usable
		if (!this.#versionsCache || this.#versionsCache.cacheCreated < Date.now() - FIRMWARE_PAYLOAD_CACHE_TTL) {
			this.#versionsCache = new SurfaceFirmwareUpdateCacheImpl()
		}

		const versionsCache = this.#versionsCache

		Promise.resolve()
			.then(async () => {
				await Promise.allSettled(
					this.#surfaceHandlers.values().map(async (surface) => {
						await surface?.checkForFirmwareUpdates(versionsCache)
					}),
				)
			})
			.catch((e) => {
				this.#logger.warn(`Failed to check for firmware updates: ${e}`)
			})
	}

	/**
	 * Trigger a check for updates for a specific surface
	 * @param surface Surface to check for updates
	 */
	triggerCheckSurfaceForUpdates(surface: SurfaceProxy): void {
		setTimeout(() => {
			Promise.resolve()
				.then(async () => {
					// Check if the cache is too old to be usable
					if (!this.#versionsCache || this.#versionsCache.cacheCreated < Date.now() - FIRMWARE_PAYLOAD_CACHE_MAX_TTL) {
						this.#versionsCache = new SurfaceFirmwareUpdateCacheImpl()
					}

					await this.#performForSurface(surface, this.#versionsCache)
				})

				.catch((e) => {
					this.#logger.warn(`Failed to check for firmware updates for surface "${surface.surfaceId}": ${e}`)
				})
		}, 0)
	}

	async #performForSurface(surface: SurfaceProxy, versionsCache: SurfaceFirmwareUpdateCache): Promise<void> {
		const updateInfo = await surface.checkForFirmwareUpdates(versionsCache)

		// No change
		if (updateInfo === false) return

		this.#logger.info(`Firmware updates change for surface "${surface.surfaceId}"`)

		// Report the change
		this.#emitChange(surface.surfaceId, updateInfo)
	}
}

interface PayloadCacheEntry {
	timestamp: number
	payload: unknown
}

class SurfaceFirmwareUpdateCacheImpl implements SurfaceFirmwareUpdateCache {
	readonly #logger = createModuleLogger('FirmwareUpdateCheck')

	readonly cacheCreated: number

	readonly #payloadCache = new Map<string, PayloadCacheEntry>()

	readonly #payloadUpdating = new Map<string, Promise<unknown | null>>()

	constructor() {
		this.cacheCreated = Date.now()
	}

	/**
	 * Fetch the payload for a specific url, either from cache or from the server
	 * @param url The url to fetch the payload from
	 * @param skipCache Whether to skip the cache and always fetch a new payload
	 * @returns The payload, or null if it could not be fetched
	 */
	async fetchJson(url: string): Promise<any> {
		const cacheKey = `json::${url}`

		// Check if already cached
		const cacheEntry = this.#payloadCache.get(cacheKey)
		if (cacheEntry) return cacheEntry.payload

		// If one is in flight, return that
		const currentInFlight = this.#payloadUpdating.get(cacheKey)
		if (currentInFlight) return currentInFlight

		const { promise: pendingPromise, resolve } = Promise.withResolvers<unknown | null>()
		this.#payloadUpdating.set(cacheKey, pendingPromise)

		// Fetch new data
		void fetch(url)
			.then(async (res) => res.json())
			.catch((e) => {
				this.#logger.warn(`Failed to fetch firmware update payload from "${url}": ${e}`)
				return null
			})
			.then((newPayload) => {
				// Update cache with the new value
				if (newPayload) {
					this.#payloadCache.set(cacheKey, { timestamp: Date.now(), payload: newPayload })
				}

				// No longer in flight
				this.#payloadUpdating.delete(cacheKey)

				// Return the new value
				resolve(newPayload || null)
			})

		return pendingPromise
	}
}

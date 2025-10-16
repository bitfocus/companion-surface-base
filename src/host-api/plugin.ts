import { SurfaceProxy, SurfaceProxyContext } from './surfaceProxy.js'
import type { HIDDevice, OpenSurfaceResult, SurfaceDrawProps, SurfacePlugin } from '../main.js'
import type { SurfaceHostContext } from './main.js'
import type { PluginFeatures, CheckHidDeviceResult, OpenHidDeviceResult } from './types.js'

export class PluginWrapper<TInfo = unknown> {
	readonly #host: SurfaceHostContext
	readonly #plugin: SurfacePlugin<TInfo>

	readonly #openSurfaces = new Map<string, SurfaceProxy | null>() // Null means opening in progress

	constructor(host: SurfaceHostContext, plugin: SurfacePlugin<TInfo>) {
		this.#host = host
		this.#plugin = plugin
	}

	getPluginFeatures(): PluginFeatures {
		return {
			supportsDetection: !!this.#plugin.detection,
			supportsHid: typeof this.#plugin.checkSupportsHidDevice === 'function',
			supportsScan: typeof this.#plugin.scanForSurfaces === 'function',
		}
	}

	async init(): Promise<void> {
		await this.#plugin.init()
	}

	async destroy(): Promise<void> {
		// Close all open surfaces
		await Promise.allSettled(
			Array.from(this.#openSurfaces.values()).map(async (surface) =>
				surface?.close().catch((e) => {
					console.error('Error closing surface', e)
				}),
			),
		)

		// Then destroy the plugin
		await this.#plugin.destroy()
	}

	async checkHidDevice(hidDevice: HIDDevice): Promise<CheckHidDeviceResult | null> {
		// Refuse if we don't support this
		if (!this.#plugin.checkSupportsHidDevice) return null

		// Check if hid device is supported
		const info = this.#plugin.checkSupportsHidDevice(hidDevice)
		if (!info) return null

		// Report back the basic info
		return {
			surfaceId: info.surfaceId,
			description: info.description,
		}
	}

	async openHidDevice(hidDevice: HIDDevice): Promise<OpenHidDeviceResult | null> {
		// Refuse if we don't support this
		if (!this.#plugin.checkSupportsHidDevice) return null

		// Check if hid device is supported
		const info = this.#plugin.checkSupportsHidDevice(hidDevice)
		if (!info) return null

		if (this.#openSurfaces.has(info.surfaceId)) {
			throw new Error(`Surface with id ${info.surfaceId} is already opened`)
		}
		this.#openSurfaces.set(info.surfaceId, null) // Mark as opening

		const surfaceContext = new SurfaceProxyContext(this.#host, info.surfaceId, (err) => {
			console.error('surface error', err)
			this.#cleanupSurfaceById(info.surfaceId)
		})

		// Open the surface
		let surface: OpenSurfaceResult | undefined
		try {
			surface = await this.#plugin.openSurface(info.surfaceId, info.pluginInfo, surfaceContext)
		} catch (e) {
			// Remove from list as it has failed
			this.#openSurfaces.delete(info.surfaceId)

			// Ensure surface is closed
			if (surface) surface.surface?.close().catch(() => {}) // Ignore errors here

			throw e
		}

		// Wrap the surface
		const wrapped = new SurfaceProxy(this.#host, surfaceContext, surface.surface, surface.registerProps)
		this.#openSurfaces.set(info.surfaceId, wrapped)

		// The surface is now open, report back
		return {
			surfaceId: info.surfaceId,
			description: info.description,
			supportsBrightness: surface.registerProps.brightness,
			surfaceLayout: surface.registerProps.surfaceLayout,
			transferVariables: surface.registerProps.transferVariables ?? null,
		}
	}

	async scanForDevices(): Promise<CheckHidDeviceResult[]> {
		if (!this.#plugin.scanForSurfaces) return []

		// TODO - how to persist the pluginInfo until opening these?

		const results = await this.#plugin.scanForSurfaces()

		return results.map((r) => ({
			surfaceId: r.surfaceId,
			description: r.description,
		}))
	}

	#cleanupSurfaceById(surfaceId: string): void {
		const surface = this.#openSurfaces.get(surfaceId)
		if (!surface) return

		try {
			// cleanup
			this.#openSurfaces.delete(surfaceId)
			this.#host.surfaceEvents.disconnected(surfaceId)

			surface.close().catch(() => {
				// Ignore
			})
		} catch (_e) {
			// Ignore
		}
	}

	async setBrightness(surfaceId: string, brightness: number): Promise<void> {
		const surface = this.#openSurfaces.get(surfaceId)
		if (!surface) throw new Error(`Surface with id ${surfaceId} is not opened`)

		// Check if brightness is supported
		if (!surface.registerProps.brightness) return

		await surface.setBrightness(brightness)
	}

	async blankSurface(surfaceId: string): Promise<void> {
		const surface = this.#openSurfaces.get(surfaceId)
		if (!surface) throw new Error(`Surface with id ${surfaceId} is not opened`)

		surface.blankSurface()
	}

	async readySurface(surfaceId: string): Promise<void> {
		const surface = this.#openSurfaces.get(surfaceId)
		if (!surface) throw new Error(`Surface with id ${surfaceId} is not opened`)

		await surface.readySurface()
	}

	async draw(surfaceId: string, drawProps: SurfaceDrawProps[]): Promise<void> {
		const surface = this.#openSurfaces.get(surfaceId)
		if (!surface) throw new Error(`Surface with id ${surfaceId} is not opened`)

		// TODO - error handling
		for (const props of drawProps) {
			const control = surface.registerProps.surfaceLayout.controls[props.controlId]
			if (!control) throw new Error(`Control "${props.controlId}" does not exist on surface ${surfaceId}`)

			await surface.draw(props)
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	async onVariableValue(surfaceId: string, name: string, value: any): Promise<void> {
		const surface = this.#openSurfaces.get(surfaceId)
		if (!surface) throw new Error(`Surface with id ${surfaceId} is not opened`)

		surface.onVariableValue(name, value)
	}

	async showLockedStatus(surfaceId: string, locked: boolean, characterCount: number): Promise<void> {
		const surface = this.#openSurfaces.get(surfaceId)
		if (!surface) throw new Error(`Surface with id ${surfaceId} is not opened`)

		surface.showLockedStatus(locked, characterCount)
	}

	async showStatus(surfaceId: string, hostname: string, status: string): Promise<void> {
		const surface = this.#openSurfaces.get(surfaceId)
		if (!surface) throw new Error(`Surface with id ${surfaceId} is not opened`)

		surface.showStatus(hostname, status)
	}
}

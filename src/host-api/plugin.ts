import { SurfaceProxy, SurfaceProxyContext } from './surfaceProxy.js'
import type { HIDDevice, OpenSurfaceResult, SurfaceDrawProps, SurfacePlugin, SurfaceRegisterProps } from '../main.js'
import type { SurfaceHostContext } from './main.js'

export class PluginWrapper<TInfo> {
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

	async checkHidDevice(msg: CheckHidDeviceMessage): Promise<CheckHidDeviceResponseMessage> {
		// Refuse if we don't support this
		if (!this.#plugin.checkSupportsHidDevice) return { info: null }

		// Check if hid device is supported
		const info = this.#plugin.checkSupportsHidDevice(msg.device)
		if (!info) return { info: null }

		// Report back the basic info
		return {
			info: {
				surfaceId: info.surfaceId,
				description: info.description,
			},
		}
	}

	async openHidDevice(msg: OpenHidDeviceMessage): Promise<OpenHidDeviceResponseMessage> {
		// Refuse if we don't support this
		if (!this.#plugin.checkSupportsHidDevice) return { info: null }

		// Check if hid device is supported
		const info = this.#plugin.checkSupportsHidDevice(msg.device)
		if (!info) return { info: null }

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
			info: {
				surfaceId: info.surfaceId,
				description: info.description,
				registerProps: surface.registerProps,
			},
		}
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

	async draw(surfaceId: string, drawProps: HostDrawProps): Promise<void> {
		const surface = this.#openSurfaces.get(surfaceId)
		if (!surface) throw new Error(`Surface with id ${surfaceId} is not opened`)

		const control = Object.entries(surface.registerProps.surfaceLayout.controls).find(
			([, c]) => c.column === drawProps.x && c.row === drawProps.y,
		)
		if (!control)
			throw new Error(`Control at position ${drawProps.y}/${drawProps.x} does not exist on surface ${surfaceId}`)

		const surfaceDrawProps: SurfaceDrawProps = {
			controlId: control[0],
			image: drawProps.image,
			color: drawProps.color,
			text: drawProps.text,
		}

		await surface.draw(surfaceDrawProps)
	}

	async onVariableValue(surfaceId: string, name: string, value: string): Promise<void> {
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

export interface PluginFeatures {
	// apiVersion: string

	supportsDetection: boolean
	supportsHid: boolean
	supportsScan: boolean
}

export interface CheckHidDeviceMessage {
	device: HIDDevice
}
export interface CheckHidDeviceResponseMessage {
	info: {
		surfaceId: string
		description: string
	} | null
}

export interface OpenHidDeviceMessage {
	device: HIDDevice
}
export interface OpenHidDeviceResponseMessage {
	info: {
		surfaceId: string
		description: string
		registerProps: SurfaceRegisterProps // TODO - convert to safe form
	} | null
}

export interface HostDrawProps {
	x: number
	y: number

	image?: Uint8Array
	color?: string // hex
	text?: string
}

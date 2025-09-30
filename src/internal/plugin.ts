import type { SurfacePlugin, OpenSurfaceResult } from '../surface-api/index.js'
import type { HostToModuleEventsV0, ModuleToHostEventsV0 } from '../host-api/api.js'
import { IpcWrapper } from '../host-api/ipc-wrapper.js'
import { SurfaceProxy, SurfaceProxyContext } from './surfaceProxy.js'

export function runPlugin<TInfo>(plugin: SurfacePlugin<TInfo>, apiVersion: string, verificationToken: string): void {
	const openSurfaces = new Map<string, SurfaceProxy | null>() // Null means opening in progress

	const ipcWrapper = new IpcWrapper<ModuleToHostEventsV0, HostToModuleEventsV0>(
		{
			destroy: async () => {
				// Close all open surfaces
				await Promise.allSettled(
					Array.from(openSurfaces.values()).map(async (surface) =>
						surface?.close().catch((e) => {
							console.error('Error closing surface', e)
						}),
					),
				)

				// Then destroy the plugin
				await plugin.destroy()
			},
			checkHidDevice: async (msg) => {
				// Refuse if we don't support this
				if (!plugin.checkSupportsHidDevice) return { info: null }

				// Check if hid device is supported
				const info = plugin.checkSupportsHidDevice(msg.device)
				if (!info) return { info: null }

				// Report back the basic info
				return {
					info: {
						surfaceId: info.surfaceId,
						description: info.description,
					},
				}
			},
			openHidDevice: async (msg) => {
				// Refuse if we don't support this
				if (!plugin.checkSupportsHidDevice) return { info: null }

				// Check if hid device is supported
				const info = plugin.checkSupportsHidDevice(msg.device)
				if (!info) return { info: null }

				if (openSurfaces.has(info.surfaceId)) {
					throw new Error(`Surface with id ${info.surfaceId} is already opened`)
				}
				openSurfaces.set(info.surfaceId, null) // Mark as opening

				const surfaceContext = new SurfaceProxyContext(ipcWrapper, info.surfaceId, (err) => {
					// TODO
				})

				// Open the surface
				let surface: OpenSurfaceResult | undefined
				try {
					surface = await plugin.openSurface(info.surfaceId, info.pluginInfo, surfaceContext)
				} catch (e) {
					// Remove from list as it has failed
					openSurfaces.delete(info.surfaceId)

					// Ensure surface is closed
					if (surface) surface.surface?.close().catch(() => {}) // Ignore errors here

					throw e
				}

				// Wrap the surface
				const wrapped = new SurfaceProxy(graphics, surfaceContext, surface.surface, surface.registerProps)
				openSurfaces.set(info.surfaceId, wrapped)

				// The surface is now open, report back
				return {
					info: {
						surfaceId: info.surfaceId,
						description: info.description,
						registerProps: surface.registerProps,
					},
				}
			},
		},
		(msg) => {
			process.send!(msg)
		},
		5000,
	)
	process.once('message', (msg: any) => {
		ipcWrapper.receivedMessage(msg)
	})

	ipcWrapper
		.sendWithCb('register', {
			apiVersion,
			verificationToken,
			// Report functionality
			supportsDetection: !!plugin.detection,
			supportsHid: typeof plugin.checkSupportsHidDevice === 'function',
			supportsScan: typeof plugin.scanForSurfaces === 'function',
		})
		.then(
			async () => {
				console.log(`Module-host accepted registration`)

				// Now initialize the plugin
				await plugin.init()
			},
			(err) => {
				console.error('Module registration failed', err)

				// Kill the process
				// eslint-disable-next-line n/no-process-exit
				process.exit(11)
			},
		)
}

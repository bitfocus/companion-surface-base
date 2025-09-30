import type { SurfacePlugin } from '../surface-api/plugin.js'
import type { HostToModuleEventsV0, ModuleToHostEventsV0 } from '../host-api/api.js'
import { IpcWrapper } from '../host-api/ipc-wrapper.js'

export function runPlugin<TInfo>(plugin: SurfacePlugin<TInfo>, apiVersion: string, verificationToken: string): void {
	const ipcWrapper = new IpcWrapper<ModuleToHostEventsV0, HostToModuleEventsV0>(
		{
			destroy: plugin.destroy.bind(plugin),
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

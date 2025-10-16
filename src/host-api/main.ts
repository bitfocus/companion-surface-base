import type { LockingGraphicsGenerator, HostCardGenerator } from './graphics.js'
import type { CheckDeviceResult, OpenDeviceResult } from './types.js'

export { PluginWrapper } from './plugin.js'
export * from './graphics.js'
export * from './types.js'

export interface SurfaceHostContext {
	readonly lockingGraphics: LockingGraphicsGenerator
	readonly cardsGenerator: HostCardGenerator

	readonly capabilities: HostCapabilities

	readonly surfaceEvents: HostSurfaceEvents

	readonly shouldOpenDiscoveredSurface: (info: CheckDeviceResult) => Promise<boolean>
	readonly notifyOpenedDiscoveredSurface: (info: OpenDeviceResult) => Promise<void>
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HostCapabilities {
	// Nothing yet
}

export interface HostSurfaceEvents {
	readonly disconnected: (surfaceId: string) => void

	readonly inputPress: (surfaceId: string, controlId: string, pressed: boolean) => void
	readonly inputRotate: (surfaceId: string, controlId: string, delta: number) => void

	readonly setVariableValue: (surfaceId: string, name: string, value: any) => void

	readonly pincodeEntry: (surfaceId: string, char: number) => void
}

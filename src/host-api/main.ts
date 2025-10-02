import type { LockingGraphicsGenerator, HostCardGenerator } from './graphics.js'

export { PluginWrapper } from './plugin.js'
export * from './graphics.js'
export * from './types.js'

export interface SurfaceHostContext {
	readonly lockingGraphics: LockingGraphicsGenerator
	readonly cardsGenerator: HostCardGenerator

	readonly capabilities: HostCapabilities

	readonly surfaceEvents: HostSurfaceEvents
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HostCapabilities {
	// Nothing yet
}

export interface HostSurfaceEvents {
	disconnected: (surfaceId: string) => void

	inputPress: (surfaceId: string, controlId: string, pressed: boolean) => void
	inputRotate: (surfaceId: string, controlId: string, delta: number) => void

	setVariableValue: (surfaceId: string, name: string, value: any) => void

	pincodeEntry: (surfaceId: string, char: number) => void
}

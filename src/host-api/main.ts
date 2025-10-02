import type { LockingGraphicsGenerator, HostCardGenerator } from './graphics.js'

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

	inputPress: (surfaceId: string, x: number, y: number, pressed: boolean) => void
	inputRotate: (surfaceId: string, x: number, y: number, delta: number) => void

	setVariableValue: (surfaceId: string, name: string, value: any) => void

	pincodeEntry: (surfaceId: string, char: number) => void
}

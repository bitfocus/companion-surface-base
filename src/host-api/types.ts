import type { SurfaceInputVariable, SurfaceOutputVariable, SurfaceSchemaLayoutDefinition } from '../main.js'

export interface PluginFeatures {
	// apiVersion: string

	supportsDetection: boolean
	supportsHid: boolean
	supportsScan: boolean
}

export interface CheckHidDeviceResult {
	surfaceId: string
	description: string
}

export interface OpenHidDeviceResult {
	surfaceId: string
	description: string
	// registerProps: SurfaceRegisterProps // TODO - convert to safe form

	/**
	 * Whether the surface supports setting brightness
	 */
	supportsBrightness: boolean
	/**
	 * The definition of the controls on the surface and the properties needed for drawing
	 */
	surfaceLayout: SurfaceSchemaLayoutDefinition
	/**
	 * Describes any custom input or output variables for the surface
	 * These are typically used for reporting values such as a tbar or battery level.
	 * Or for providing non-button values such as leds next to a tbar
	 */
	transferVariables: Array<SurfaceInputVariable | SurfaceOutputVariable> | null
}

// export interface HostDrawProps {
// 	x: number
// 	y: number

// 	image?: Uint8Array
// 	color?: string // hex
// 	text?: string
// }

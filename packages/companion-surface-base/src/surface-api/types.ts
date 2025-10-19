import type { SurfacePincodeMap } from './pincode.js'
import type { SurfaceInstance } from './instance.js'
import type { SurfaceSchemaLayoutDefinition } from '../../generated/surface-layout.d.ts'

/**
 * A representation of a HID device
 * A simplified form of the HIDDevice from node-hid
 */
export interface HIDDevice {
	vendorId: number
	productId: number
	serialNumber?: string | undefined
	manufacturer?: string | undefined
	product?: string | undefined
	release: number
	interface: number
	usagePage?: number | undefined
	usage?: number | undefined
}

export type SurfaceId = string
export type ControlId = string

export interface SurfaceInputVariable {
	id: string
	type: 'input'
	name: string
	description?: string
}
export interface SurfaceOutputVariable {
	id: string
	type: 'output'
	name: string
	description?: string
}

/**
 * Describes the capabilities of a surface when it is registered
 */
export interface SurfaceRegisterProps {
	/**
	 * Whether the surface supports setting brightness
	 */
	brightness: boolean
	/**
	 * The definition of the controls on the surface and the properties needed for drawing
	 */
	surfaceLayout: SurfaceSchemaLayoutDefinition
	/**
	 * Describes any custom input or output variables for the surface
	 * These are typically used for reporting values such as a tbar or battery level.
	 * Or for providing non-button values such as leds next to a tbar
	 */
	transferVariables?: Array<SurfaceInputVariable | SurfaceOutputVariable>
	/**
	 * If the surface supports pincode entry, this is the desired arrangement of the pin entry buttons
	 */
	pincodeMap: SurfacePincodeMap | null
}

export interface SurfaceRegisterPropsComplete extends SurfaceRegisterProps {
	gridSize: GridSize
	fallbackBitmapSize: number
}

export interface OpenSurfaceResult {
	surface: SurfaceInstance
	registerProps: SurfaceRegisterProps
}

export interface SurfaceDrawProps {
	controlId: string

	/**
	 * If the surface requested an image to be drawn, this Uint8Array will contain the pixel data in the requested dimensions and format
	 */
	image?: Uint8Array

	/**
	 * If the surface requested a background color, this is the color to display
	 * This is typically only used for surfaces which have buttons with a RGB backlight
	 */
	color?: string // hex

	/**
	 * If the surface requested button text, this is the text to draw
	 * This is typically only used for surfaces which have buttons with text-only displays
	 */
	text?: string
}

export interface GridSize {
	rows: number
	columns: number
}

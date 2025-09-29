import type { SurfacePincodeMap } from './pincode.js'
import type { SurfaceInstance } from './instance.js'

export type PixelFormat = 'rgba' | 'rgb'

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
export interface SurfaeRegisterProps {
	/**
	 * Whether the surface supports setting brightness
	 */
	brightness: boolean
	/**
	 * The number of rows the surface occupies
	 */
	rowCount: number
	/**
	 * The number of columns the surface occupies
	 */
	columnCount: number
	/**
	 * The width&height of bitmap images the surface can display
	 * TODO: complex layouts!
	 */
	bitmapSize: number | null
	/**
	 * Whether the surface wants a background color when drawing
	 */
	colours: boolean
	/**
	 * Whether the surface wants text when drawing
	 */
	text: boolean
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

export interface OpenSurfaceResult {
	surface: SurfaceInstance
	registerProps: SurfaeRegisterProps
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ClientCapabilities {
	// For future use to support new functionality
	// TODO - explain what this means, and how it interacts in satellite mode
}

export type DeviceDrawImageFn = (width: number, height: number, format: PixelFormat) => Promise<Buffer>

export interface DeviceDrawProps {
	x: number
	y: number

	/**
	 * If the surface requested an image to be drawn, this function can be used to generate the image
	 * This function should be called with to generate a buffer of the correct size and format
	 */
	// TODO - with complex surface layouts, this should become a buffer
	image?: DeviceDrawImageFn

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

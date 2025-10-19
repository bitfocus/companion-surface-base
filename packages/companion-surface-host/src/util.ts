import type { SurfaceSchemaBitmapConfig, SurfaceSchemaPixelFormat } from '@companion-surface/base'

/** Type assert that a value is never */
export function assertNever(_val: never): void {
	// Nothing to do
}

/**
 * Make all optional properties be required and `| undefined`
 * This is useful to ensure that no property is missed, when manually converting between types, but allowing fields to be undefined
 */
export type Complete<T> = {
	[P in keyof Required<T>]: Pick<T, P> extends Required<Pick<T, P>> ? T[P] : T[P] | undefined
}

export function getPixelFormat(bitmapStyle: SurfaceSchemaBitmapConfig): SurfaceSchemaPixelFormat {
	return bitmapStyle.format || 'rgb'
}
export function getPixelFormatLength(pixelFormat: SurfaceSchemaPixelFormat): number {
	switch (pixelFormat) {
		case 'bgr':
		case 'rgb':
			return 3
		case 'bgra':
		case 'rgba':
			return 4
		default:
			assertNever(pixelFormat)
			throw new Error(`Unknown pixel format ${pixelFormat}`)
	}
}

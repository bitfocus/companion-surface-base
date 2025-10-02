import type { SurfaceSchemaBitmapConfig, SurfaceSchemaPixelFormat } from '../../generated/surface-layout.d.ts'
import { assertNever } from '../util.js'
import type { CardGenerator } from './cards.js'

export interface SurfaceGraphicsContext {
	readonly locking: LockingGraphicsGenerator
	readonly cards: CardGenerator
}

export interface LockingGraphicsGenerator {
	generatePincodeChar(bitmapStyle: SurfaceSchemaBitmapConfig, keyCode: number | string): Uint8Array

	generatePincodeValue(bitmapStyle: SurfaceSchemaBitmapConfig, charCount: number): Uint8Array
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

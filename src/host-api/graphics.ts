import type { SurfaceSchemaBitmapConfig, SurfaceSchemaPixelFormat } from '../../generated/surface-layout.d.ts'

export interface LockingGraphicsGenerator {
	generatePincodeChar(
		bitmapStyle: SurfaceSchemaBitmapConfig,
		keyCode: number | string,
	): Promise<Uint8Array | Uint8ClampedArray>

	generatePincodeValue(
		bitmapStyle: SurfaceSchemaBitmapConfig,
		charCount: number,
	): Promise<Uint8Array | Uint8ClampedArray>
}

export interface HostCardGenerator {
	generateBasicCard(
		width: number,
		height: number,
		pixelFormat: SurfaceSchemaPixelFormat,
		remoteIp: string,
		status: string,
	): Promise<Uint8Array>

	generateLcdStripCard(
		width: number,
		height: number,
		pixelFormat: SurfaceSchemaPixelFormat,
		remoteIp: string,
		status: string,
	): Promise<Uint8Array>

	generateLogoCard(width: number, height: number, pixelFormat: SurfaceSchemaPixelFormat): Promise<Uint8Array>
}

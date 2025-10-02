import type { SurfaceSchemaBitmapConfig, SurfaceSchemaPixelFormat } from '../../generated/surface-layout.d.ts'

export interface LockingGraphicsGenerator {
	generatePincodeChar(bitmapStyle: SurfaceSchemaBitmapConfig, keyCode: number | string): Uint8Array

	generatePincodeValue(bitmapStyle: SurfaceSchemaBitmapConfig, charCount: number): Uint8Array
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

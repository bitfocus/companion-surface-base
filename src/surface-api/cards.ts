import type { SurfaceSchemaPixelFormat } from '../../generated/surface-layout.d.ts'

export interface CardGenerator {
	generateBasicCard(width: number, height: number, pixelFormat: SurfaceSchemaPixelFormat): Promise<Buffer>

	// TODO - can this be done in the basic card when detecting some extreme aspect ratios?
	generateLcdStripCard(width: number, height: number, pixelFormat: SurfaceSchemaPixelFormat): Promise<Buffer>

	generateLogoCard(width: number, height: number, pixelFormat: SurfaceSchemaPixelFormat): Promise<Buffer>
}

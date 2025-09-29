import type { PixelFormat } from './types.js'

export interface CardGenerator {
	generateBasicCard(width: number, height: number, pixelFormat: PixelFormat): Promise<Buffer>

	// TODO - can this be done in the basic card when detecting some extreme aspect ratios?
	generateLcdStripCard(width: number, height: number, pixelFormat: PixelFormat): Promise<Buffer>

	generateLogoCard(width: number, height: number, pixelFormat: PixelFormat): Promise<Buffer>
}

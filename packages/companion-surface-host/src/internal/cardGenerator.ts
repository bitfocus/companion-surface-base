import type { HostCardGenerator } from '../graphics.js'
import type { CardGenerator, SurfaceSchemaPixelFormat } from '@companion-surface/base'

export class SurfaceCardGeneratorProxy implements CardGenerator {
	readonly #hostCardGenerator: HostCardGenerator
	readonly #remoteIp: string
	readonly #status: string

	constructor(hostCardGenerator: HostCardGenerator, remoteIp: string, status: string) {
		this.#hostCardGenerator = hostCardGenerator
		this.#remoteIp = remoteIp
		this.#status = status
	}

	async generateBasicCard(width: number, height: number, pixelFormat: SurfaceSchemaPixelFormat): Promise<Uint8Array> {
		return this.#hostCardGenerator.generateBasicCard(width, height, pixelFormat, this.#remoteIp, this.#status)
	}

	async generateLcdStripCard(
		width: number,
		height: number,
		pixelFormat: SurfaceSchemaPixelFormat,
	): Promise<Uint8Array> {
		return this.#hostCardGenerator.generateLcdStripCard(width, height, pixelFormat, this.#remoteIp, this.#status)
	}

	async generateLogoCard(width: number, height: number, pixelFormat: SurfaceSchemaPixelFormat): Promise<Uint8Array> {
		return this.#hostCardGenerator.generateLogoCard(width, height, pixelFormat)
	}
}

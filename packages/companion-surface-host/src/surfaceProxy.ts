import type {
	HostCapabilities,
	ControlId,
	SurfaceContext,
	SurfaceDrawProps,
	SurfaceId,
	SurfaceInstance,
	SurfacePincodeMap,
	SurfacePincodeMapPageEntry,
	SurfaceRegisterProps,
	SurfaceSchemaBitmapConfig,
	SurfaceSchemaControlDefinition,
	SurfaceSchemaControlStylePreset,
} from '@companion-surface/base'
import { DrawingState } from './internal/drawingState.js'
import { SurfaceHostContext } from './main.js'
import { getPixelFormat, getPixelFormatLength } from './util.js'
import { SurfaceCardGeneratorProxy } from './internal/cardGenerator.js'

/**
 * A wrapper around a surface to handle pincode locking and other common tasks
 */
export class SurfaceProxy {
	readonly #host: SurfaceHostContext
	readonly #context: SurfaceProxyContext
	readonly #surface: SurfaceInstance
	readonly #registerProps: SurfaceRegisterProps

	readonly #drawQueue = new DrawingState<string>('preinit')

	#pincodeCharacterCount = 0

	get surfaceId(): SurfaceId {
		return this.#surface.surfaceId
	}
	get productName(): string {
		return this.#surface.productName
	}

	get registerProps(): SurfaceRegisterProps {
		return this.#registerProps
	}

	constructor(
		host: SurfaceHostContext,
		context: SurfaceProxyContext,
		surface: SurfaceInstance,
		registerProps: SurfaceRegisterProps,
	) {
		this.#host = host
		this.#context = context
		this.#surface = surface
		this.#registerProps = registerProps

		// Setup the cyclical reference :(
		context.storeSurface(this, registerProps.pincodeMap)
	}

	async close(): Promise<void> {
		this.#drawQueue.abortQueued('closed')

		return this.#surface.close()
	}

	async init(displayHost: string, status: string): Promise<void> {
		// Ensure it doesn't get stuck as locked
		this.#context.setLocked(false)

		console.log('Initialising ' + this.surfaceId)

		await this.#surface.init()

		this.showStatus(displayHost, status)
	}

	async readySurface(): Promise<void> {
		this.#drawQueue.abortQueued('reinit')

		return this.#surface.ready()
	}

	async setBrightness(percent: number): Promise<void> {
		return this.#surface.setBrightness(percent)
	}

	blankSurface(): void {
		if (this.#drawQueue.state === 'blank') return

		this.#drawQueue.abortQueued('blank')
		this.#drawQueue.queueJob('blank', async (_key, signal) => {
			if (signal.aborted) return
			await this.#surface.blank()
		})
	}

	async draw(data: SurfaceDrawProps): Promise<void> {
		if (this.#context.isLocked) return

		if (this.#drawQueue.state !== 'draw') {
			// Abort any other draws and blank the surface
			this.#drawQueue.abortQueued('draw', async () => this.#surface.blank())
		}

		this.#drawQueue.queueJob(data.controlId, async (_key, signal) => {
			if (signal.aborted) return

			const controlId = data.controlId

			const controlInfo = this.#registerProps.surfaceLayout.controls[controlId]
			if (!controlInfo) throw new Error(`Received draw for unknown controlId: ${controlId}`)

			await this.#surface.draw(signal, data)
		})
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	onVariableValue(name: string, value: any): void {
		if (this.#surface.onVariableValue) {
			this.#surface.onVariableValue(name, value)
		} else {
			console.warn(`Variable value not supported: ${this.surfaceId}`)
		}
	}

	showLockedStatus(locked: boolean, characterCount: number): void {
		const wasLocked = this.#context.isLocked
		this.#context.setLocked(locked)
		this.#pincodeCharacterCount = characterCount

		if (!wasLocked) {
			// Always discard the previous draw
			this.#drawQueue.abortQueued('locked-pending-draw', async () => this.#surface.blank())
		}

		if (!this.#context.pincodeMap) {
			console.warn(`Pincode layout not supported not supported: ${this.surfaceId}`)
			return
		}

		if (!wasLocked) {
			this.drawPincodePage()
		} else {
			this.#drawPincodeStatus()
		}

		if (this.#surface.showLockedStatus) {
			this.#surface.showLockedStatus(locked, characterCount)
		}
	}

	#lastPincodePageDraw = new Set<ControlId>()
	drawPincodePage(): void {
		if (!this.#context.isLocked) return

		this.#drawPincodeStatus()

		const previousDraw = this.#lastPincodePageDraw
		this.#lastPincodePageDraw = new Set<ControlId>()

		// Draw the number buttons and other details
		this.#drawPincodeNumber(0)
		this.#drawPincodeNumber(1)
		this.#drawPincodeNumber(2)
		this.#drawPincodeNumber(3)
		this.#drawPincodeNumber(4)
		this.#drawPincodeNumber(5)
		this.#drawPincodeNumber(6)
		this.#drawPincodeNumber(7)
		this.#drawPincodeNumber(8)
		this.#drawPincodeNumber(9)

		// Clear any buttons which weren't drawn this time
		for (const controlId of previousDraw.values()) {
			if (this.#lastPincodePageDraw.has(controlId)) continue

			this.#drawPincodeButton(
				controlId,
				async (bitmapStyle) =>
					Buffer.alloc(bitmapStyle.w * bitmapStyle.h * getPixelFormatLength(getPixelFormat(bitmapStyle)), 0),
				'#000000',
				'',
			)
		}

		if (this.#context.pincodeMap?.type === 'multiple-page') {
			this.#drawPincodeButton(
				this.#context.pincodeMap.nextPage,
				async (bitmapStyle) => this.#host.lockingGraphics.generatePincodeChar(bitmapStyle, '+'),
				'#ffffff',
				'+',
			)
		}
	}

	#drawPincodeStatus() {
		if (!this.#context.pincodeMap || this.#context.pincodeMap.type === 'custom') return
		const pincodeXy = this.#context.pincodeMap.pincode
		if (!pincodeXy) return

		this.#drawPincodeButton(
			pincodeXy,
			async (bitmapStyle) => this.#host.lockingGraphics.generatePincodeValue(bitmapStyle, this.#pincodeCharacterCount),
			'#ffffff',
			'*'.repeat(this.#pincodeCharacterCount),
		)
	}

	#drawPincodeNumber(key: keyof SurfacePincodeMapPageEntry) {
		const pincodeMap = this.#context.pincodeMap
		if (!pincodeMap) return

		const controlId = this.#context.currentPincodePage?.[key]
		if (!controlId) return

		this.#lastPincodePageDraw.add(controlId)

		this.#drawPincodeButton(
			controlId,
			async (bitmapStyle) => this.#host.lockingGraphics.generatePincodeChar(bitmapStyle, key),
			'#ffffff',
			`${key}`,
		)
	}

	#drawPincodeButton(
		controlId: ControlId,
		bitmapFn: (bitmapFormat: SurfaceSchemaBitmapConfig) => Promise<Uint8Array>,
		color: string,
		text: string,
	) {
		const controlInfo = this.#registerProps.surfaceLayout.controls[controlId]

		// Missing the control for some reason.. Probably using the old api.
		if (!controlInfo) return

		const stylePreset = this.#getStyleForPreset(controlInfo.stylePreset)

		this.#drawQueue.queueJob(controlId, async (_key, signal) => {
			if (signal.aborted) return

			const image = stylePreset.bitmap ? await bitmapFn(stylePreset.bitmap) : undefined

			if (signal.aborted) return

			await this.#surface.draw(signal, {
				controlId,
				image,
				color,
				text,
			})
		})
	}

	showStatus(hostname: string, status: string): void {
		// Always discard the previous draw
		this.#drawQueue.abortQueued('status')

		this.#drawQueue.queueJob('blank', async (_key, signal) => {
			if (signal.aborted) return

			const generator = new SurfaceCardGeneratorProxy(this.#host.cardsGenerator, hostname, status)

			await this.#surface.showStatus(signal, generator, status)
		})
	}

	#getStyleForPreset(stylePreset: string | undefined): SurfaceSchemaControlStylePreset {
		return (
			(stylePreset && this.#registerProps.surfaceLayout.stylePresets[stylePreset]) ||
			this.#registerProps.surfaceLayout.stylePresets.default
		)
	}
}

export class SurfaceProxyContext implements SurfaceContext {
	readonly #host: SurfaceHostContext
	readonly #surfaceId: SurfaceId

	readonly disconnect: SurfaceContext['disconnect']

	#surface: SurfaceProxy | null = null
	#pincodeMap: SurfacePincodeMap | null = null

	#isLocked = false
	#lockButtonPage = 0

	get isLocked(): boolean {
		return this.#isLocked
	}

	get pincodeMap(): SurfacePincodeMap | null {
		return this.#pincodeMap
	}

	get currentPincodePage(): SurfacePincodeMapPageEntry | undefined {
		const pincodeMap = this.#pincodeMap
		if (!pincodeMap) return undefined

		if (pincodeMap.type === 'custom') return undefined

		if (pincodeMap.type === 'single-page') return pincodeMap

		if (this.#lockButtonPage >= pincodeMap.pages.length) {
			this.#lockButtonPage = 0
		}
		return pincodeMap.pages[this.#lockButtonPage] as SurfacePincodeMapPageEntry
	}

	get capabilities(): HostCapabilities {
		return this.#host.capabilities
	}

	constructor(host: SurfaceHostContext, surfaceId: SurfaceId, onDisconnect: SurfaceContext['disconnect']) {
		this.#host = host
		this.#surfaceId = surfaceId

		this.disconnect = onDisconnect
	}

	storeSurface(surfaceProxy: SurfaceProxy, pincodeMap: SurfacePincodeMap | null): void {
		if (this.#surface) throw new Error('Surface already set')
		this.#surface = surfaceProxy
		this.#pincodeMap = pincodeMap
	}

	setLocked(locked: boolean): void {
		if (!this.isLocked && locked) {
			this.#lockButtonPage = 0
		}

		this.#isLocked = locked
	}

	#getControlById(controlId: ControlId): SurfaceSchemaControlDefinition | null {
		if (!this.#surface) throw new Error('Surface not set')

		return this.#surface.registerProps.surfaceLayout.controls[controlId] ?? null
	}

	keyDownById(controlId: ControlId): void {
		if (this.#isLocked) {
			this.#pincodePressByControlId(controlId)
			return
		}

		const control = this.#getControlById(controlId)
		if (!control) {
			console.log(`Surface ${this.#surfaceId} control ${controlId} not found in keyDownById`)
			return
		}

		this.#host.surfaceEvents.inputPress(this.#surfaceId, controlId, true)
	}
	keyUpById(controlId: ControlId): void {
		if (this.#isLocked) return

		const control = this.#getControlById(controlId)
		if (!control) {
			console.log(`Surface ${this.#surfaceId} control ${controlId} not found in keyDownById`)
			return
		}

		this.#host.surfaceEvents.inputPress(this.#surfaceId, controlId, false)
	}
	keyDownUpById(controlId: ControlId): void {
		if (this.#isLocked) {
			this.#pincodePressByControlId(controlId)
			return
		}

		const control = this.#getControlById(controlId)
		if (!control) {
			console.log(`Surface ${this.#surfaceId} control ${controlId} not found in keyDownById`)
			return
		}

		this.#host.surfaceEvents.inputPress(this.#surfaceId, controlId, true)

		setTimeout(() => {
			if (!this.#isLocked) {
				this.#host.surfaceEvents.inputPress(this.#surfaceId, controlId, false)
			}
		}, 20)
	}
	rotateLeftById(controlId: ControlId): void {
		if (this.#isLocked) return

		const control = this.#getControlById(controlId)
		if (!control) {
			console.log(`Surface ${this.#surfaceId} control ${controlId} not found in keyDownById`)
			return
		}

		this.#host.surfaceEvents.inputRotate(this.#surfaceId, controlId, -1)
	}
	rotateRightById(controlId: ControlId): void {
		if (this.#isLocked) return

		const control = this.#getControlById(controlId)
		if (!control) {
			console.log(`Surface ${this.#surfaceId} control ${controlId} not found in keyDownById`)
			return
		}

		this.#host.surfaceEvents.inputRotate(this.#surfaceId, controlId, 1)
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	sendVariableValue(variable: string, value: any): void {
		if (this.#isLocked) return

		this.#host.surfaceEvents.setVariableValue(this.#surfaceId, variable, value)
	}

	#pincodePressByControlId(controlId: ControlId): void {
		const pincodeMap = this.#pincodeMap
		if (!pincodeMap) return

		if (pincodeMap.type === 'custom') return

		if (pincodeMap.type === 'multiple-page' && pincodeMap.nextPage === controlId) {
			this.#lockButtonPage = (this.#lockButtonPage + 1) % pincodeMap.pages.length
			this.#surface?.drawPincodePage()
			return
		}

		const pageInfo = pincodeMap.type === 'single-page' ? pincodeMap : pincodeMap.pages[this.#lockButtonPage]
		if (!pageInfo) return

		const index = Object.entries(pageInfo).find(([, v]) => controlId === v)?.[0]
		if (!index) return

		const indexNumber = Number(index)
		if (isNaN(indexNumber)) return

		this.#host.surfaceEvents.pincodeEntry(this.#surfaceId, indexNumber)
	}
}

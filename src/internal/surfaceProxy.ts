import type { IpcWrapper } from '../host-api/ipc-wrapper.js'
import type {
	ClientCapabilities,
	ControlId,
	SurfaceContext,
	SurfaceDrawProps,
	SurfaceId,
	SurfaceInstance,
	SurfacePincodeMap,
	SurfacePincodeMapPageEntry,
	SurfaceRegisterProps,
} from '../surface-api/index.js'
import { DrawingState } from './drawingState.js'
import type { ModuleToHostEventsV0, HostToModuleEventsV0 } from '../host-api/api.js'
import type {
	SurfaceSchemaBitmapConfig,
	SurfaceSchemaControlDefinition,
	SurfaceSchemaControlStylePreset,
} from '../../generated/surface-layout.d.ts'

/**
 * A wrapper around a surface to handle pincode locking and other common tasks
 */
export class SurfaceProxy {
	readonly #graphics: SurfaceGraphicsContext
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
		graphics: SurfaceGraphicsContext,
		context: SurfaceProxyContext,
		surface: SurfaceInstance,
		registerProps: SurfaceRegisterProps,
	) {
		this.#graphics = graphics
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

	async deviceAdded(): Promise<void> {
		this.#drawQueue.abortQueued('reinit')

		return this.#surface.ready()
	}

	async setBrightness(percent: number): Promise<void> {
		return this.#surface.setBrightness(percent)
	}

	blankDevice(): void {
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
			// Abort any other draws and blank the device
			this.#drawQueue.abortQueued('draw', async () => this.#surface.blank())
		}

		this.#drawQueue.queueJob(data.controlId, async (_key, signal) => {
			if (signal.aborted) return

			const controlId = data.controlId

			const controlInfo = this.#registerProps.surfaceManifest.controls[controlId]
			if (!controlInfo) throw new Error(`Received draw for unknown controlId: ${controlId}`)

			return this.#surface.draw(signal, data)
		})
	}

	onVariableValue(name: string, value: string): void {
		if (this.#surface.onVariableValue) {
			this.#surface.onVariableValue(name, value)
		} else {
			console.warn(`Variable value not supported: ${this.surfaceId}`)
		}
	}

	onLockedStatus(locked: boolean, characterCount: number): void {
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

		if (this.#surface.onLockedStatus) {
			this.#surface.onLockedStatus(locked, characterCount)
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

			this.#drawPincodeButton(controlId, (bitmapStyle) => Buffer.alloc(width * height * 4, 0), '#000000', '')
		}

		if (this.#context.pincodeMap?.type === 'multiple-page') {
			this.#drawPincodeButton(
				this.#context.pincodeMap.nextPage,
				(bitmapStyle) => Buffer.from(this.#graphics.locking.generatePincodeChar(width, height, '+')),
				'#ffffff',
				'+',
			)
		}
	}

	#drawPincodeStatus() {
		if (!this.#context.pincodeMap || this.#context.pincodeMap.type === 'none') return
		const pincodeXy = this.#context.pincodeMap.pincode
		if (!pincodeXy) return

		this.#drawPincodeButton(
			pincodeXy,
			(bitmapStyle) =>
				Buffer.from(this.#graphics.locking.generatePincodeValue(width, height, this.#pincodeCharacterCount)),
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
			(bitmapStyle) => Buffer.from(this.#graphics.locking.generatePincodeChar(width, height, key)),
			'#ffffff',
			`${key}`,
		)
	}

	#drawPincodeButton(
		controlId: ControlId,
		bitmapFn: (bitmapFormat: SurfaceSchemaBitmapConfig) => Buffer,
		color: string,
		text: string,
	) {
		const controlInfo = this.#registerProps.surfaceManifest.controls[controlId]

		// Missing the control for some reason.. Probably using the old api.
		if (!controlInfo) return

		const stylePreset = this.#getStyleForPreset(controlInfo.stylePreset)
		const image = stylePreset.bitmap ? bitmapFn(stylePreset.bitmap) : undefined

		this.#drawQueue.queueJob(controlId, async (_key, signal) => {
			if (signal.aborted) return

			await this.#surface.draw(signal, {
				controlId,
				image,
				color,
				text,
			})
		})
	}

	showStatus(_hostname: string, _status: string): void {
		// Always discard the previous draw
		this.#drawQueue.abortQueued('status')

		this.#drawQueue.queueJob('blank', async (_key, signal) => {
			if (signal.aborted) return
			await this.#surface.showStatus(signal, this.#graphics.cards)
		})
	}

	#getStyleForPreset(stylePreset: string | undefined): SurfaceSchemaControlStylePreset {
		return (
			(stylePreset && this.#registerProps.surfaceManifest.stylePresets[stylePreset]) ||
			this.#registerProps.surfaceManifest.stylePresets.default
		)
	}
}

export class SurfaceProxyContext implements SurfaceContext {
	readonly #client: IpcWrapper<ModuleToHostEventsV0, HostToModuleEventsV0>
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

		if (pincodeMap.type === 'none') return undefined

		if (pincodeMap.type === 'single-page') return pincodeMap

		if (this.#lockButtonPage >= pincodeMap.pages.length) {
			this.#lockButtonPage = 0
		}
		return pincodeMap.pages[this.#lockButtonPage] as SurfacePincodeMapPageEntry
	}

	get capabilities(): ClientCapabilities {
		return this.#client.capabilities
	}

	constructor(
		client: IpcWrapper<ModuleToHostEventsV0, HostToModuleEventsV0>,
		surfaceId: SurfaceId,
		onDisconnect: SurfaceContext['disconnect'],
	) {
		this.#client = client
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

		return this.#surface.registerProps.surfaceManifest.controls[controlId] ?? null
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

		this.#client.sendWithNoCb('input-press', {
			surfaceId: this.#surfaceId,
			x: control.column,
			y: control.row,
			pressed: true,
		})
	}
	keyUpById(controlId: ControlId): void {
		if (this.#isLocked) return

		const control = this.#getControlById(controlId)
		if (!control) {
			console.log(`Surface ${this.#surfaceId} control ${controlId} not found in keyDownById`)
			return
		}

		this.#client.sendWithNoCb('input-press', {
			surfaceId: this.#surfaceId,
			x: control.column,
			y: control.row,
			pressed: false,
		})
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

		this.#client.sendWithNoCb('input-press', {
			surfaceId: this.#surfaceId,
			x: control.column,
			y: control.row,
			pressed: true,
		})

		setTimeout(() => {
			if (!this.#isLocked) {
				this.#client.sendWithNoCb('input-press', {
					surfaceId: this.#surfaceId,
					x: control.column,
					y: control.row,
					pressed: false,
				})
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

		this.#client.sendWithNoCb('input-rotate', {
			surfaceId: this.#surfaceId,
			x: control.column,
			y: control.row,
			delta: -1,
		})
	}
	rotateRightById(controlId: ControlId): void {
		if (this.#isLocked) return

		const control = this.#getControlById(controlId)
		if (!control) {
			console.log(`Surface ${this.#surfaceId} control ${controlId} not found in keyDownById`)
			return
		}

		this.#client.sendWithNoCb('input-rotate', {
			surfaceId: this.#surfaceId,
			x: control.column,
			y: control.row,
			delta: 1,
		})
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	sendVariableValue(variable: string, value: any): void {
		if (this.#isLocked) return

		this.#client.sendWithNoCb('set-variable-value', {
			surfaceId: this.#surfaceId,
			name: variable,
			value: value,
		})
	}

	#pincodePressByControlId(controlId: ControlId): void {
		const pincodeMap = this.#pincodeMap
		if (!pincodeMap) return

		if (pincodeMap.type === 'none') return

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

		this.#client.sendWithNoCb('pincode-entry', {
			surfaceId: this.#surfaceId,
			keycode: indexNumber,
		})
	}
}

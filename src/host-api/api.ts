/**
 * Warning: these types are intentionally semi-isolated from the module-api folder.
 * While it causes a lot of duplicate typings and requires us to do translation of types,
 * it allows for us to be selective as to whether a change impacts the module api or the host api.
 * This will allow for cleaner and more stable apis which can both evolve at different rates
 */

import type { HIDDevice, SurfaceRegisterProps } from '../surface-api/types.js'
import type { LogLevel } from '../surface-api/enums.js'

export interface ModuleToHostEventsV0 {
	register: (msg: RegisterMessage) => RegisterResponseMessage

	/** The connection has a message for the Companion log */
	'log-message': (msg: LogMessageMessage) => never

	'input-press': (msg: InputPressMessage) => never
	'input-rotate': (msg: InputRotateMessage) => never

	'pincode-entry': (msg: PincodeEntryMessage) => never

	'set-variable-value': (msg: SetVariableValueMessage) => never
}

export interface HostToModuleEventsV0 {
	// /** Initialise the connection with the given config and label */
	// init: (msg: InitMessage) => InitResponseMessage
	/** Cleanup the connection in preparation for the thread/process to be terminated */
	destroy: (msg: Record<string, never>) => void

	checkHidDevice: (msg: CheckHidDeviceMessage) => CheckHidDeviceResponseMessage
	openHidDevice: (msg: OpenHidDeviceMessage) => OpenHidDeviceResponseMessage
}

export interface RegisterMessage {
	apiVersion: string
	verificationToken: string

	supportsDetection: boolean
	supportsHid: boolean
	supportsScan: boolean
}
export type RegisterResponseMessage = Record<string, never>

export interface CheckHidDeviceMessage {
	device: HIDDevice
}
export interface CheckHidDeviceResponseMessage {
	info: {
		surfaceId: string
		description: string
	} | null
}

export interface OpenHidDeviceMessage {
	device: HIDDevice
}
export interface OpenHidDeviceResponseMessage {
	info: {
		surfaceId: string
		description: string
		registerProps: SurfaceRegisterProps // TODO - convert to safe form
	} | null
}

export interface LogMessageMessage {
	level: LogLevel
	message: string
}

export interface InputPressMessage {
	surfaceId: string
	x: number
	y: number
	pressed: boolean
}

export interface InputRotateMessage {
	surfaceId: string
	x: number
	y: number
	delta: 1 | -1
}

export interface PincodeEntryMessage {
	surfaceId: string
	keycode: number
}

export interface SetVariableValueMessage {
	surfaceId: string
	name: string
	value: string
}

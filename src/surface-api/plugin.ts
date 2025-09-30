import type EventEmitter from 'node:events'
import type { HIDDevice, OpenSurfaceResult, SurfaceId } from './types.js'
import { SurfaceContext } from './context.js'

export interface DiscoveredSurfaceInfo<TInfo> {
	surfaceId: string
	description: string
	pluginInfo: TInfo
}

export interface SurfacePluginDetectionEvents<TInfo> {
	deviceAdded: [device: DiscoveredSurfaceInfo<TInfo>]
	deviceRemoved: [deviceId: SurfaceId]
}

/**
 * For some plugins which only support using a builtin detection mechanism, this can be used to provide the detection info
 */
export interface SurfacePluginDetection<TInfo> extends EventEmitter<SurfacePluginDetectionEvents<TInfo>> {
	/**
	 * Trigger this plugin to perform a scan for any connected surfaces.
	 * This is used when the user triggers a scan, so should refresh any caches when possible
	 */
	triggerScan(): Promise<void>
}

/**
 * The base SurfacePlugin interface, for all surface plugins
 */
export interface SurfacePlugin<TInfo> {
	/**
	 * Some plugins are forced to use a builtin detection mechanism by their surfaces or inner library
	 * In this case, this property should be set to an instance of SurfacePluginDetection
	 *
	 * It is preferred that plugins to NOT use this, and to instead use the abtractions we provide to reduce the cost of scanning and detection
	 */
	readonly detection?: SurfacePluginDetection<TInfo>

	/**
	 * Initialize the plugin
	 */
	init(): Promise<void>

	/**
	 * Uninitialise the plugin
	 */
	destroy(): Promise<void>

	/**
	 * Check if a HID device is supported by this plugin
	 * Note: This must not open the device, just perform checks based on the provided info to see if it is supported
	 * @param device HID device to check
	 * @returns Info about the device if it is supported, otherwise null
	 */
	checkSupportsHidDevice?: (device: HIDDevice) => DiscoveredSurfaceInfo<TInfo> | null

	/**
	 * Perform a scan for devices, but not open them
	 * Note: This should only be used if the plugin uses a protocol where we don't have other handling for
	 */
	scanForSurfaces?: () => Promise<DiscoveredSurfaceInfo<TInfo>[]>

	/**
	 * Open a discovered/known surface
	 * @param surfaceId Id of the surface
	 * @param pluginInfo Plugin specific info about the surface
	 * @param context Context for the surface
	 * @returns Instance of the surface
	 */
	openSurface: (surfaceId: string, pluginInfo: TInfo, context: SurfaceContext) => Promise<OpenSurfaceResult>
}

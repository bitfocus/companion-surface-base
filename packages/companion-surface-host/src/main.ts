export { PluginWrapper } from './plugin.js'
export * from './graphics.js'
export * from './types.js'
export * from './context.js'

// Re-export types from base package that are useful for host implementations
export {
	SurfaceModuleManifest,
	validateSurfaceManifest,
	SurfaceSchemaPixelFormat,
	SurfaceSchemaLayoutDefinition,
	SurfaceSchemaControlDefinition,
	SurfaceSchemaControlStylePreset,
	SurfaceSchemaBitmapConfig,
	LogLevel,
	// TODO - verify these
	HIDDevice,
	SurfaceDrawProps,
} from '@companion-surface/base'

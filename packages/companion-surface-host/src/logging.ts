import type { LoggingSink } from '@companion-surface/base'

export function registerLoggingSink(sink: LoggingSink): void {
	global.SURFACE_LOGGER = sink
}

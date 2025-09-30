/* eslint-disable n/no-process-exit */
import { HostApiNodeJsIpc } from './host-api/versions.js'
import fs from 'fs/promises'
import type { SurfaceModuleManifest } from './manifest.js'
import path from 'path'
import { SurfacePlugin } from './surface-api/plugin.js'
import { runPlugin } from './internal/plugin.js'

let hasEntrypoint = false
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let pluginInstance: SurfacePlugin<any> | undefined

/**
 * Setup the plugin for execution
 * This should be called once per-plugin, to register the class that should be executed
 * @param factory The class for the plugin
 * @param upgradeScripts Upgrade scripts
 */
export function setupPlugin<TInfo>(plugin: SurfacePlugin<TInfo>): void {
	Promise.resolve()
		.then(async () => {
			// Ensure only called once per plugin
			if (hasEntrypoint) throw new Error(`setupPlugin can only be called once`)
			hasEntrypoint = true

			const manifestPath = process.env.SURFACE_MANIFEST
			if (!manifestPath) throw new Error('Surface initialise is missing SURFACE_MANIFEST')

			// check manifest api field against apiVersion
			const manifestBlob = await fs.readFile(manifestPath)
			const manifestJson: Partial<SurfaceModuleManifest> = JSON.parse(manifestBlob.toString())

			if (manifestJson.runtime?.api !== HostApiNodeJsIpc) throw new Error(`Surface manifest 'api' mismatch`)
			if (!manifestJson.runtime.apiVersion) throw new Error(`Surface manifest 'apiVersion' missing`)
			let apiVersion = manifestJson.runtime.apiVersion

			if (apiVersion === '0.0.0') {
				// It looks like the module is in dev mode. lets attempt to load the package.json from this module instead
				try {
					const baseJsonStr = await fs.readFile(path.join(__dirname, '../package.json'))
					const baseJson = JSON.parse(baseJsonStr.toString())
					if (baseJson.name === '@companion-surface/base') {
						apiVersion = baseJson.version
					}
				} catch (_e) {
					throw new Error('Failed to determine module api version')
				}
			}

			if (!process.send) throw new Error('Module is not being run with ipc')

			console.log(`Starting up surface plugin: ${manifestJson.id}`)

			const verificationToken = process.env.VERIFICATION_TOKEN
			if (typeof verificationToken !== 'string' || !verificationToken)
				throw new Error('Module initialise is missing VERIFICATION_TOKEN')

			pluginInstance = plugin

			runPlugin(plugin, apiVersion, verificationToken)
		})
		.catch((e) => {
			console.error(`Failed to startup module:`)
			console.error(e.stack || e.message)
			process.exit(1)
		})
}

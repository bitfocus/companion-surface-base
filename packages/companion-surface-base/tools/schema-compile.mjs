// eslint-disable-next-line n/no-extraneous-import
import { $ } from 'zx'
import fs from 'fs'
import Ajv2020 from 'ajv/dist/2020.js'
import standaloneCode from 'ajv/dist/standalone/index.js'
import manifestSchema from '../assets/manifest.schema.json' with { type: 'json' }
import surfaceLayoutSchema from '../assets/surface-layout.schema.json' with { type: 'json' }
import { fileURLToPath } from 'url'

// Compile Typescript definitions from the JSON schema
await $`json2ts --input assets/manifest.schema.json --output generated/manifest.d.ts --additionalProperties=false`
await $`json2ts --input assets/surface-layout.schema.json --output generated/surface-layout.d.ts --additionalProperties=false`

{
	// The generated code will have a default export:
	// `module.exports = <validateFunctionCode>;module.exports.default = <validateFunctionCode>;`
	const ajv = new Ajv2020({ code: { source: true, esm: true } })
	const validate = ajv.compile(manifestSchema)
	let moduleCode = standaloneCode(ajv, validate)

	// Now you can write the module code to file
	const outputPath = new URL('../generated/validate_manifest.js', import.meta.url)
	fs.writeFileSync(outputPath, moduleCode)

	// the reference to ajv runtime makes some consumers grumpy, so pre-bundle it with esbuild
	await $`esbuild --bundle ${fileURLToPath(outputPath)} --outfile=${fileURLToPath(outputPath)} --target=node22 --platform=node --format=esm --allow-overwrite`
}

{
	// The generated code will have a default export:
	// `module.exports = <validateFunctionCode>;module.exports.default = <validateFunctionCode>;`
	const ajv = new Ajv2020({
		code: { source: true, esm: true },
		allowMatchingProperties: true, // because of 'default' in stylePresets
	})
	const validate = ajv.compile(surfaceLayoutSchema)
	let moduleCode = standaloneCode(ajv, validate)

	// Now you can write the module code to file
	fs.writeFileSync(new URL('../generated/validate_surface_layout.js', import.meta.url), moduleCode)
}

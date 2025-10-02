import type { ControlId } from './types.js'

/**
 * Describe the pincode map for a surface
 */
export type SurfacePincodeMap = SurfacePincodeMapPageSingle | SurfacePincodeMapPageMultiple | SurfacePincodeMapCustom

/**
 * An empty pincode map, for surfaces which do a custom pincode entry arrangement
 */
export interface SurfacePincodeMapCustom {
	type: 'custom'
}

/**
 * A pincode map with a single page of buttons
 */
export interface SurfacePincodeMapPageSingle extends SurfacePincodeMapPageEntry {
	type: 'single-page'
	pincode: ControlId | null
}

/**
 * A pincode map with multiple pages of buttons
 */
export interface SurfacePincodeMapPageMultiple {
	type: 'multiple-page'
	pincode: ControlId
	nextPage: ControlId
	pages: Partial<SurfacePincodeMapPageEntry>[]
}

export interface SurfacePincodeMapPageEntry {
	0: ControlId
	1: ControlId
	2: ControlId
	3: ControlId
	4: ControlId
	5: ControlId
	6: ControlId
	7: ControlId
	8: ControlId
	9: ControlId
}

/**
 * Describe the pincode map for a surface
 */
export type SurfacePincodeMap = SurfacePincodeMapPageSingle | SurfacePincodeMapPageMultiple | SurfacePincodeMapNone

/**
 * An empty pincode map, for surfaces which do not support pincode entry
 */
export interface SurfacePincodeMapNone {
	type: 'none'
}

/**
 * A pincode map with a single page of buttons
 */
export interface SurfacePincodeMapPageSingle extends SurfacePincodeMapPageEntry {
	type: 'single-page'
	pincode: [number, number] | null
}

/**
 * A pincode map with multiple pages of buttons
 */
export interface SurfacePincodeMapPageMultiple {
	type: 'multiple-page'
	pincode: [number, number]
	nextPage: [number, number]
	pages: Partial<SurfacePincodeMapPageEntry>[]
}

export interface SurfacePincodeMapPageEntry {
	0: [number, number]
	1: [number, number]
	2: [number, number]
	3: [number, number]
	4: [number, number]
	5: [number, number]
	6: [number, number]
	7: [number, number]
	8: [number, number]
	9: [number, number]
}

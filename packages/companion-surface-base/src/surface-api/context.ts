// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HostCapabilities {
	// For future use to support new functionality
	// TODO - explain what this means, and how it interacts in satellite mode
}

export interface SurfaceContext {
	get isLocked(): boolean

	get capabilities(): HostCapabilities

	disconnect(error: Error): void

	keyDownById(controlId: string): void
	keyUpById(controlId: string): void
	keyDownUpById(controlId: string): void
	rotateLeftById(controlId: string): void
	rotateRightById(controlId: string): void

	sendVariableValue(variable: string, value: any): void
}

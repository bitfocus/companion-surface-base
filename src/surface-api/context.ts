export interface SurfaceContext {
	get isLocked(): boolean

	disconnect(error: Error): void

	keyDown(keyIndex: number): void
	keyUp(keyIndex: number): void
	keyDownUp(keyIndex: number): void
	rotateLeft(keyIndex: number): void
	rotateRight(keyIndex: number): void

	keyDownXY(x: number, y: number): void
	keyUpXY(x: number, y: number): void
	keyDownUpXY(x: number, y: number): void
	rotateLeftXY(x: number, y: number): void
	rotateRightXY(x: number, y: number): void

	sendVariableValue(variable: string, value: any): void
}

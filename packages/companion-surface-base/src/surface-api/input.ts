export type InputValue = number | string | boolean

export type OptionsObject = { [key: string]: InputValue | undefined }

export type SomeCompanionInputField =
	| CompanionInputFieldStaticText
	| CompanionInputFieldTextInput
	| CompanionInputFieldDropdown
	| CompanionInputFieldNumber
	| CompanionInputFieldCheckbox

/**
 * The common properties for an input field
 */
export interface CompanionInputFieldBase {
	/** The unique id of this input field within the input group */
	id: string
	/** The type of this input field */
	type: 'static-text' | 'textinput' | 'dropdown' | 'number' | 'checkbox'
	/** The label of the field */
	label: string
	/** A hover tooltip for this field */
	tooltip?: string
	/** A longer description/summary/notes for this field */
	description?: string

	/**
	 * A companion expression to check whether this input should be visible, based on the current options selections within the input group
	 *
	 * This is the same syntax as other expressions written inside of Comapnion.
	 * You can access a value of the current options using `$(options:some_field_id)`.
	 * This does not support the `isVisibleData` property, let us know if you need this.
	 */
	isVisibleExpression?: string
}

/**
 * A static un-editable line of text
 *
 * ### Example
 * ```js
 * {
 * 	id: 'important-line',
 * 	type: 'static-text',
 * 	label: 'Important info',
 * 	value: 'Some message here'
 * }
 * ```
 */
export interface CompanionInputFieldStaticText extends CompanionInputFieldBase {
	type: 'static-text'
	/** The text to show */
	value: string
}

/**
 * A basic text input field
 *
 * ### Example
 * ```js
 * {
 * 	id: 'val',
 * 	type: 'textinput',
 * 	label: 'Provide name',
 * 	'default': 'Bob'
 * }
 * ```
 */
export interface CompanionInputFieldTextInput extends CompanionInputFieldBase {
	type: 'textinput'
	/**
	 * The default text value
	 */
	default?: string
	/**
	 * A regex to use to inform the user if the current input is valid.
	 * Note: values may not conform to this, it is a visual hint only
	 */
	regex?: string
}

export type DropdownChoiceId = string | number
/**
 * An option for a dropdown input
 *
 * Available for actions/feedbacks/config
 */
export interface DropdownChoice {
	/** Value of the option */
	id: DropdownChoiceId
	/** Label to show to users */
	label: string
}

/**
 * A dropdown input field
 *
 * ### Example
 * ```js
 * {
 * 	id: 'val',
 * 	type: 'dropdown',
 * 	label: 'Select name',
 * 	choices: [
 * 		{ id: 'bob', label: 'Bob' },
 * 		{ id: 'sally', label: 'Sally' },
 * 	],
 * 	default: 'bob'
 * }
 * ```
 */
export interface CompanionInputFieldDropdown extends CompanionInputFieldBase {
	type: 'dropdown'

	/** The possible choices */
	choices: DropdownChoice[]

	/** The default selected value */
	default: DropdownChoiceId
}

/**
 * A checkbox input field
 *
 * ### Example
 * ```js
 * {
 * 	id: 'doit',
 * 	type: 'checkbox',
 * 	label: 'Do the thing',
 * 	default: true
 * }
 * ```
 */
export interface CompanionInputFieldCheckbox extends CompanionInputFieldBase {
	type: 'checkbox'
	/** The default value */
	default: boolean
}

/**
 * A number input field
 *
 * ### Example
 * ```js
 * {
 * 	id: 'size',
 * 	type: 'number',
 * 	label: 'Target size',
 * 	default: 50,
 * 	min: 0,
 * 	max: 100
 * }
 * ```
 */
export interface CompanionInputFieldNumber extends CompanionInputFieldBase {
	type: 'number'

	/** The default value */
	default: number

	/**
	 * The minimum value to allow
	 * Note: values may not conform to this, it is a visual hint only
	 */
	min: number
	/**
	 * The maximum value to allow
	 * Note: values may not conform to this, it is a visual hint only
	 */
	max: number
}

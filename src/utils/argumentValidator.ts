
/**
 * Argument validation utilities for commands
 */

export interface ValidationRule {
	validate: (value: string) => boolean;
	errorMessage: string;
}

/**
 * Common validation rules
 */
export const validators = {
	/**
	 * Validate that value is not empty
	 */
	required: (errorMessage = "This argument is required"): ValidationRule => ({
		validate: (value: string) => value.trim().length > 0,
		errorMessage,
	}),

	/**
	 * Validate string length
	 */
	length: (min: number, max: number, errorMessage?: string): ValidationRule => ({
		validate: (value: string) => value.length >= min && value.length <= max,
		errorMessage: errorMessage || `Must be between ${min} and ${max} characters`,
	}),

	/**
	 * Validate URL format
	 */
	url: (errorMessage = "Invalid URL format"): ValidationRule => ({
		validate: (value: string) => {
			try {
				new URL(value);
				return true;
			} catch {
				return false;
			}
		},
		errorMessage,
	}),

	/**
	 * Validate number
	 */
	number: (min?: number, max?: number, errorMessage?: string): ValidationRule => ({
		validate: (value: string) => {
			const num = Number(value);
			if (isNaN(num)) return false;
			if (min !== undefined && num < min) return false;
			if (max !== undefined && num > max) return false;
			return true;
		},
		errorMessage: errorMessage || `Must be a number${min !== undefined ? ` >= ${min}` : ""}${max !== undefined ? ` <= ${max}` : ""}`,
	}),

	/**
	 * Validate integer
	 */
	integer: (min?: number, max?: number, errorMessage?: string): ValidationRule => ({
		validate: (value: string) => {
			const num = Number(value);
			if (!Number.isInteger(num)) return false;
			if (min !== undefined && num < min) return false;
			if (max !== undefined && num > max) return false;
			return true;
		},
		errorMessage: errorMessage || `Must be an integer${min !== undefined ? ` >= ${min}` : ""}${max !== undefined ? ` <= ${max}` : ""}`,
	}),

	/**
	 * Validate against a list of allowed values
	 */
	oneOf: (allowed: string[], errorMessage?: string): ValidationRule => ({
		validate: (value: string) => allowed.includes(value.toLowerCase()),
		errorMessage: errorMessage || `Must be one of: ${allowed.join(", ")}`,
	}),

	/**
	 * Validate Discord user mention or ID
	 */
	userMention: (errorMessage = "Invalid user mention or ID"): ValidationRule => ({
		validate: (value: string) => {
			// Discord user ID format: 17-19 digits
			if (/^\d{17,19}$/.test(value)) return true;
			// User mention format: <@!123456789012345678> or <@123456789012345678>
			if (/^<@!?\d{17,19}>$/.test(value)) return true;
			return false;
		},
		errorMessage,
	}),

	/**
	 * Validate Discord role mention or ID
	 */
	roleMention: (errorMessage = "Invalid role mention or ID"): ValidationRule => ({
		validate: (value: string) => {
			// Discord role ID format: 17-19 digits
			if (/^\d{17,19}$/.test(value)) return true;
			// Role mention format: <@&123456789012345678>
			if (/^<@&\d{17,19}>$/.test(value)) return true;
			return false;
		},
		errorMessage,
	}),

	/**
	 * Validate Discord channel mention or ID
	 */
	channelMention: (errorMessage = "Invalid channel mention or ID"): ValidationRule => ({
		validate: (value: string) => {
			// Discord channel ID format: 17-19 digits
			if (/^\d{17,19}$/.test(value)) return true;
			// Channel mention format: <#123456789012345678>
			if (/^<#\d{17,19}>$/.test(value)) return true;
			return false;
		},
		errorMessage,
	}),
};

/**
 * Validate arguments against rules
 */
export function validateArguments(
	args: string[],
	rules: ValidationRule[],
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	for (let i = 0; i < Math.max(args.length, rules.length); i++) {
		const value = args[i] || "";
		const rule = rules[i];

		if (rule && !rule.validate(value)) {
			errors.push(`Argument ${i + 1}: ${rule.errorMessage}`);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Validate a single argument
 */
export function validateArgument(
	value: string,
	rule: ValidationRule,
): { valid: boolean; error?: string } {
	if (rule.validate(value)) {
		return { valid: true };
	}
	return { valid: false, error: rule.errorMessage };
}


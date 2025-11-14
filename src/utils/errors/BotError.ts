/**
 * Base error class for all bot-related errors
 */
export class BotError extends Error {
	public readonly code: string;
	public readonly context?: Record<string, unknown>;
	public readonly timestamp: Date;
	public readonly userFriendly: boolean;

	constructor(
		message: string,
		code: string = "BOT_ERROR",
		userFriendly: boolean = false,
		context?: Record<string, unknown>,
	) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.userFriendly = userFriendly;
		this.context = context;
		this.timestamp = new Date();

		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	/**
	 * Convert error to a loggable format
	 */
	toLogFormat(): Record<string, unknown> {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			context: this.context,
			timestamp: this.timestamp.toISOString(),
			stack: this.stack,
		};
	}

	/**
	 * Get user-friendly error message
	 */
	getUserMessage(): string {
		if (this.userFriendly) {
			return this.message;
		}
		// Default user-friendly message
		return "An unexpected error occurred. Please try again later.";
	}
}

/**
 * Error for API-related failures (Spotify, Last.fm, Genius, etc.)
 */
export class APIError extends BotError {
	public readonly statusCode?: number;
	public readonly apiName: string;
	public readonly retryable: boolean;

	constructor(
		message: string,
		apiName: string,
		statusCode?: number,
		retryable: boolean = false,
		context?: Record<string, unknown>,
	) {
		super(
			message,
			`API_ERROR_${apiName.toUpperCase()}`,
			false,
			context,
		);
		this.apiName = apiName;
		this.statusCode = statusCode;
		this.retryable = retryable;
	}

	/**
	 * Check if error is due to rate limiting
	 */
	isRateLimit(): boolean {
		return this.statusCode === 429;
	}

	/**
	 * Check if error is a client error (4xx)
	 */
	isClientError(): boolean {
		return this.statusCode !== undefined && this.statusCode >= 400 && this.statusCode < 500;
	}

	/**
	 * Check if error is a server error (5xx)
	 */
	isServerError(): boolean {
		return this.statusCode !== undefined && this.statusCode >= 500;
	}
}

/**
 * Error for database-related failures
 */
export class DatabaseError extends BotError {
	public readonly operation: string;
	public readonly retryable: boolean;

	constructor(
		message: string,
		operation: string,
		retryable: boolean = false,
		context?: Record<string, unknown>,
	) {
		super(message, "DATABASE_ERROR", false, context);
		this.operation = operation;
		this.retryable = retryable;
	}
}

/**
 * Error for validation failures
 */
export class ValidationError extends BotError {
	public readonly field?: string;

	constructor(
		message: string,
		field?: string,
		context?: Record<string, unknown>,
	) {
		super(message, "VALIDATION_ERROR", true, context);
		this.field = field;
	}
}

/**
 * Error for permission/authorization failures
 */
export class PermissionError extends BotError {
	public readonly requiredPermission?: string;
	public readonly userId?: string;
	public readonly guildId?: string;

	constructor(
		message: string,
		requiredPermission?: string,
		userId?: string,
		guildId?: string,
		context?: Record<string, unknown>,
	) {
		super(message, "PERMISSION_ERROR", true, {
			...context,
			requiredPermission,
			userId,
			guildId,
		});
		this.requiredPermission = requiredPermission;
		this.userId = userId;
		this.guildId = guildId;
	}
}

/**
 * Error for command execution failures
 */
export class CommandError extends BotError {
	public readonly commandName: string;
	public readonly userId?: string;
	public readonly guildId?: string;

	constructor(
		message: string,
		commandName: string,
		userId?: string,
		guildId?: string,
		context?: Record<string, unknown>,
	) {
		super(message, "COMMAND_ERROR", true, {
			...context,
			commandName,
			userId,
			guildId,
		});
		this.commandName = commandName;
		this.userId = userId;
		this.guildId = guildId;
	}
}


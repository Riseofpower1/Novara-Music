import type { Lavamusic } from "../../structures/index";
import Logger from "../../structures/Logger";
import { sendLog } from "../BotLog";
import {
	BotError,
	APIError,
	DatabaseError,
	CommandError,
	PermissionError,
	ValidationError,
} from "./BotError";

const logger = new Logger();

/**
 * Handle and log errors with proper context
 */
export function handleError(
	error: unknown,
	context: {
		client?: Lavamusic;
		commandName?: string;
		userId?: string;
		guildId?: string;
		channelId?: string;
		additionalContext?: Record<string, unknown>;
	} = {},
): void {
	const {
		client,
		commandName,
		userId,
		guildId,
		channelId,
		additionalContext = {},
	} = context;

	// Convert unknown error to BotError if needed
	const botError = error instanceof BotError ? error : new BotError(
		error instanceof Error ? error.message : String(error),
		"UNKNOWN_ERROR",
		false,
		{
			originalError: error,
			...additionalContext,
		},
	);

	// Add context to error if not already present
	if (commandName && !(botError instanceof CommandError)) {
		Object.assign(botError, {
			context: {
				...botError.context,
				commandName,
				userId,
				guildId,
				channelId,
			},
		});
	}

	// Log error
	logError(botError, client);

	// Send to log channel if client is available
	if (client) {
		const errorMessage = formatErrorForLogging(botError, {
			commandName,
			userId,
			guildId,
		});

		sendLog(client, errorMessage, "error").catch((logError) => {
			logger.error("Failed to send error to log channel:", logError);
		});
	}
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: unknown): string {
	if (error instanceof BotError) {
		return error.getUserMessage();
	}

	if (error instanceof Error) {
		// For non-BotError errors, provide generic message
		return "An unexpected error occurred. Please try again later.";
	}

	return "An unexpected error occurred. Please try again later.";
}

/**
 * Log error with structured format
 */
export function logError(error: unknown, client?: Lavamusic): void {
	if (error instanceof BotError) {
		const logData = error.toLogFormat();

		// Use appropriate log level based on error type
		if (error instanceof APIError && error.isRateLimit()) {
			logger.warn("Rate limit error:", logData);
		} else if (error instanceof DatabaseError) {
			logger.error("Database error:", logData);
		} else if (error instanceof PermissionError) {
			logger.warn("Permission error:", logData);
		} else if (error instanceof ValidationError) {
			logger.warn("Validation error:", logData);
		} else if (error instanceof CommandError) {
			logger.error("Command error:", logData);
		} else {
			logger.error("Bot error:", logData);
		}

		// Also log to client logger if available
		if (client) {
			client.logger.error(`[${error.code}] ${error.message}`, logData);
		}
	} else {
		// Handle non-BotError errors
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;

		logger.error("Unhandled error:", {
			message: errorMessage,
			stack: errorStack,
			error,
		});

		if (client) {
			client.logger.error("Unhandled error:", errorMessage, errorStack);
		}
	}
}

/**
 * Format error for logging channel
 */
function formatErrorForLogging(
	error: BotError,
	context: {
		commandName?: string;
		userId?: string;
		guildId?: string;
	},
): string {
	const parts: string[] = [];

	parts.push(`**Error:** ${error.code}`);
	parts.push(`**Message:** ${error.message}`);

	if (context.commandName) {
		parts.push(`**Command:** ${context.commandName}`);
	}

	if (context.userId) {
		parts.push(`**User:** <@${context.userId}> (${context.userId})`);
	}

	if (context.guildId) {
		parts.push(`**Guild:** ${context.guildId}`);
	}

	if (error instanceof APIError) {
		parts.push(`**API:** ${error.apiName}`);
		if (error.statusCode) {
			parts.push(`**Status:** ${error.statusCode}`);
		}
		if (error.isRateLimit()) {
			parts.push("⚠️ **Rate Limited**");
		}
	}

	if (error instanceof DatabaseError) {
		parts.push(`**Operation:** ${error.operation}`);
	}

	if (error.context && Object.keys(error.context).length > 0) {
		parts.push(
			`**Context:** \`\`\`json\n${JSON.stringify(error.context, null, 2)}\n\`\`\``,
		);
	}

	return parts.join("\n");
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends unknown[], R>(
	fn: (...args: T) => Promise<R>,
	context?: {
		commandName?: string;
		userId?: string;
		guildId?: string;
	},
): (...args: T) => Promise<R> {
	return async (...args: T): Promise<R> => {
		try {
			return await fn(...args);
		} catch (error) {
			handleError(error, context);
			throw error;
		}
	};
}


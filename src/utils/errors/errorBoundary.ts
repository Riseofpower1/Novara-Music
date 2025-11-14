import type { Lavamusic } from "../../structures/index";
import Logger from "../../structures/Logger";
import { BotError, DatabaseError } from "./BotError";
import { handleError } from "./errorHandler";

const logger = new Logger();

/**
 * Error boundary for critical startup operations
 * Prevents the bot from crashing during initialization
 */
export async function withStartupErrorBoundary<T>(
	fn: () => Promise<T>,
	operation: string,
	client?: Lavamusic,
): Promise<T | null> {
	try {
		return await fn();
	} catch (error) {
		const startupError = new BotError(
			`Startup operation failed: ${operation}`,
			"STARTUP_ERROR",
			false,
			{
				operation,
				originalError: error instanceof Error ? error.message : String(error),
			},
		);

		logger.error(`[STARTUP] Critical error in ${operation}:`, startupError.toLogFormat());

		if (client) {
			handleError(startupError, {
				client,
				additionalContext: { phase: "startup", operation },
			});
		}

		// Don't throw - allow bot to continue with degraded functionality
		return null;
	}
}

/**
 * Error boundary for database operations
 * Provides retry logic and graceful degradation
 */
export async function withDatabaseErrorBoundary<T>(
	fn: () => Promise<T>,
	operation: string,
	retries: number = 3,
): Promise<T | null> {
	for (let attempt = 0; attempt < retries; attempt++) {
		try {
			return await fn();
		} catch (error) {

			// Check if it's a connection error (retryable)
			const isConnectionError =
				error instanceof Error &&
				(error.message.includes("ECONNREFUSED") ||
					error.message.includes("ETIMEDOUT") ||
					error.message.includes("connection") ||
					error.message.includes("MongoNetworkError"));

			if (!isConnectionError || attempt === retries - 1) {
				// Not retryable or last attempt
				const dbError = new DatabaseError(
					`Database operation failed: ${operation}`,
					operation,
					isConnectionError,
					{
						attempt: attempt + 1,
						originalError: error instanceof Error ? error.message : String(error),
					},
				);

				logger.error(`[DATABASE] Error in ${operation}:`, dbError.toLogFormat());
				return null;
			}

			// Wait before retry (exponential backoff)
			const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
			await new Promise((resolve) => setTimeout(resolve, delay));
			logger.warn(
				`[DATABASE] Retrying ${operation} (attempt ${attempt + 2}/${retries})...`,
			);
		}
	}

	return null;
}

/**
 * Error boundary for critical paths that should not crash the bot
 */
export async function withErrorBoundary<T>(
	fn: () => Promise<T>,
	operation: string,
	client?: Lavamusic,
	fallback?: T,
): Promise<T> {
	try {
		return await fn();
	} catch (error) {
		handleError(error, {
			client,
			additionalContext: { operation, critical: true },
		});

		// Return fallback value if provided, otherwise return null/undefined
		if (fallback !== undefined) {
			return fallback;
		}

		// Type-safe fallback
		return null as T;
	}
}

/**
 * Synchronous error boundary for non-async critical operations
 */
export function withSyncErrorBoundary<T>(
	fn: () => T,
	operation: string,
	client?: Lavamusic,
	fallback?: T,
): T {
	try {
		return fn();
	} catch (error) {
		handleError(error, {
			client,
			additionalContext: { operation, critical: true, synchronous: true },
		});

		if (fallback !== undefined) {
			return fallback;
		}

		return null as T;
	}
}


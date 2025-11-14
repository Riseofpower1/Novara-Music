import { APIError } from "./BotError";

export interface RetryOptions {
	maxRetries?: number;
	initialDelay?: number;
	maxDelay?: number;
	backoffMultiplier?: number;
	retryable?: (error: unknown) => boolean;
	onRetry?: (attempt: number, error: unknown) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "retryable" | "onRetry">> = {
	maxRetries: 3,
	initialDelay: 1000, // 1 second
	maxDelay: 30000, // 30 seconds
	backoffMultiplier: 2,
};

/**
 * Calculate delay for exponential backoff
 */
function calculateDelay(
	attempt: number,
	initialDelay: number,
	maxDelay: number,
	multiplier: number,
): number {
	const delay = initialDelay * Math.pow(multiplier, attempt);
	return Math.min(delay, maxDelay);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown, retryable?: (error: unknown) => boolean): boolean {
	if (retryable) {
		return retryable(error);
	}

	// Default: retry on API errors that are marked as retryable
	if (error instanceof APIError) {
		return error.retryable && (error.isServerError() || error.isRateLimit());
	}

	// Retry on network errors (no response)
	if (error && typeof error === "object" && "code" in error) {
		const code = (error as { code: string }).code;
		return code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND";
	}

	return false;
}

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param options - Retry configuration
 * @returns Result of the function
 * @throws Last error if all retries fail
 */
export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {},
): Promise<T> {
	const {
		maxRetries,
		initialDelay,
		maxDelay,
		backoffMultiplier,
		retryable,
		onRetry,
	} = {
		...DEFAULT_OPTIONS,
		...options,
	};

	let lastError: unknown;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// Don't retry if we've exhausted attempts or error is not retryable
			if (attempt >= maxRetries || !isRetryableError(error, retryable)) {
				throw error;
			}

			// Calculate delay with exponential backoff
			const delay = calculateDelay(attempt, initialDelay, maxDelay, backoffMultiplier);

			// Call onRetry callback if provided
			if (onRetry) {
				onRetry(attempt + 1, error);
			}

			// Wait before retrying
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	// This should never be reached, but TypeScript needs it
	throw lastError;
}


export {
	BotError,
	APIError,
	DatabaseError,
	ValidationError,
	PermissionError,
	CommandError,
} from "./BotError";

export { retryWithBackoff, type RetryOptions } from "./retry";
export { handleError, formatErrorForUser, logError } from "./errorHandler";
export {
	withStartupErrorBoundary,
	withDatabaseErrorBoundary,
	withErrorBoundary,
	withSyncErrorBoundary,
} from "./errorBoundary";


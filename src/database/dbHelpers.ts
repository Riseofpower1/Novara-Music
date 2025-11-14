import { DatabaseError } from "../utils/errors";
import Logger from "../structures/Logger";

const logger = new Logger();

/**
 * Wrapper for database operations with consistent error handling
 * @param operation - The database operation function
 * @param operationName - Name of the operation for error messages
 * @param fallback - Optional fallback value if operation fails
 * @returns Result of the operation or fallback value
 */
export async function withDatabaseOperation<T>(
	operation: () => Promise<T>,
	operationName: string,
	fallback?: T,
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		const dbError = new DatabaseError(
			`Database operation failed: ${operationName}`,
			operationName,
			true, // Retryable
			{
				originalError: error instanceof Error ? error.message : String(error),
			},
		);

		logger.error(`[DATABASE] ${operationName} failed:`, dbError);

		if (fallback !== undefined) {
			return fallback;
		}

		throw dbError;
	}
}

/**
 * Wrapper for database findOneAndUpdate operations
 */
export async function findOneAndUpdateWithError<T>(
	model: any,
	filter: Record<string, unknown>,
	update: Record<string, unknown>,
	options: { upsert?: boolean; new?: boolean } = {},
	operationName: string,
): Promise<T> {
	return withDatabaseOperation(
		async () => {
			const result = await model.findOneAndUpdate(filter, update, {
				upsert: options.upsert ?? false,
				new: options.new ?? true,
			});
			return result;
		},
		operationName,
	);
}

/**
 * Wrapper for database findOne operations
 */
export async function findOneWithError<T>(
	model: any,
	filter: Record<string, unknown>,
	operationName: string,
	fallback?: T,
): Promise<T | null> {
	return withDatabaseOperation(
		async () => {
			const result = await model.findOne(filter);
			return result;
		},
		operationName,
		fallback ?? null,
	);
}

/**
 * Wrapper for database find operations
 */
export async function findWithError<T>(
	model: any,
	filter: Record<string, unknown> = {},
	operationName: string,
	fallback: T[] = [],
): Promise<T[]> {
	return withDatabaseOperation(
		async () => {
			const results = await model.find(filter);
			return results;
		},
		operationName,
		fallback,
	);
}

/**
 * Wrapper for database delete operations
 */
export async function deleteWithError(
	model: any,
	filter: Record<string, unknown>,
	operationName: string,
): Promise<void> {
	await withDatabaseOperation(
		async () => {
			await model.deleteOne(filter);
		},
		operationName,
	);
}


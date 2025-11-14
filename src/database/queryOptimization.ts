import type { Model, Document } from "mongoose";
import { DatabaseError } from "../utils/errors";
import Logger from "../structures/Logger";

const logger = new Logger();

export interface QueryMetrics {
	operation: string;
	duration: number;
	model: string;
	filter?: Record<string, unknown>;
	projection?: Record<string, number>;
}

// In-memory query metrics storage
const queryMetrics: QueryMetrics[] = [];
const MAX_METRICS = 1000; // Keep last 1000 queries

/**
 * Track query performance
 */
export function trackQuery(metrics: QueryMetrics): void {
	queryMetrics.push(metrics);
	
	// Keep only last MAX_METRICS entries
	if (queryMetrics.length > MAX_METRICS) {
		queryMetrics.shift();
	}
	
	// Log slow queries (> 100ms)
	if (metrics.duration > 100) {
		logger.warn(
			`[DB SLOW QUERY] ${metrics.operation} on ${metrics.model} took ${metrics.duration}ms`,
		);
	}
}

/**
 * Get query metrics summary
 */
export function getQueryMetricsSummary(): {
	totalQueries: number;
	averageDuration: number;
	slowQueries: number;
	topSlowQueries: QueryMetrics[];
} {
	if (queryMetrics.length === 0) {
		return {
			totalQueries: 0,
			averageDuration: 0,
			slowQueries: 0,
			topSlowQueries: [],
		};
	}
	
	const totalDuration = queryMetrics.reduce((sum, m) => sum + m.duration, 0);
	const averageDuration = totalDuration / queryMetrics.length;
	const slowQueries = queryMetrics.filter((m) => m.duration > 100);
	const topSlowQueries = [...slowQueries]
		.sort((a, b) => b.duration - a.duration)
		.slice(0, 10);
	
	return {
		totalQueries: queryMetrics.length,
		averageDuration: Math.round(averageDuration * 100) / 100,
		slowQueries: slowQueries.length,
		topSlowQueries,
	};
}

/**
 * Clear query metrics
 */
export function clearQueryMetrics(): void {
	queryMetrics.length = 0;
	logger.info("[DB METRICS] Cleared query metrics");
}

/**
 * Find one with projection and performance tracking
 */
export async function findOneOptimized<T extends Document>(
	model: Model<T>,
	filter: Record<string, unknown>,
	projection?: Record<string, number>,
	operationName = "findOne",
): Promise<T | null> {
	const startTime = Date.now();
	
	try {
		let query = model.findOne(filter);
		
		if (projection) {
			query = query.select(projection);
		}
		
		const result = await query.exec();
		const duration = Date.now() - startTime;
		
		trackQuery({
			operation: operationName,
			duration,
			model: model.modelName,
			filter,
			projection,
		});
		
		return result;
	} catch (error) {
		const duration = Date.now() - startTime;
		trackQuery({
			operation: operationName,
			duration,
			model: model.modelName,
			filter,
			projection,
		});
		
		throw new DatabaseError(
			`Query failed: ${operationName}`,
			operationName,
			true,
			{ originalError: error instanceof Error ? error.message : String(error) },
		);
	}
}

/**
 * Find with projection, limit, sort, and performance tracking
 */
export async function findOptimized<T extends Document>(
	model: Model<T>,
	filter: Record<string, unknown> = {},
	options: {
		projection?: Record<string, number>;
		limit?: number;
		sort?: Record<string, 1 | -1>;
		skip?: number;
	} = {},
	operationName = "find",
): Promise<T[]> {
	const startTime = Date.now();
	
	try {
		let query = model.find(filter);
		
		if (options.projection) {
			query = query.select(options.projection);
		}
		
		if (options.sort) {
			query = query.sort(options.sort);
		}
		
		if (options.skip) {
			query = query.skip(options.skip);
		}
		
		if (options.limit) {
			query = query.limit(options.limit);
		}
		
		const results = await query.exec();
		const duration = Date.now() - startTime;
		
		trackQuery({
			operation: operationName,
			duration,
			model: model.modelName,
			filter,
			projection: options.projection,
		});
		
		return results;
	} catch (error) {
		const duration = Date.now() - startTime;
		trackQuery({
			operation: operationName,
			duration,
			model: model.modelName,
			filter,
			projection: options.projection,
		});
		
		throw new DatabaseError(
			`Query failed: ${operationName}`,
			operationName,
			true,
			{ originalError: error instanceof Error ? error.message : String(error) },
		);
	}
}

/**
 * Batch insert operations
 */
export async function batchInsert<T extends Document>(
	model: Model<T>,
	documents: Partial<T>[],
	operationName = "batchInsert",
): Promise<T[]> {
	const startTime = Date.now();
	
	try {
		const results = await model.insertMany(documents, { ordered: false });
		const duration = Date.now() - startTime;
		
		trackQuery({
			operation: operationName,
			duration,
			model: model.modelName,
		});
		
		logger.info(`[DB BATCH] Inserted ${results.length} documents into ${model.modelName} in ${duration}ms`);
		
		return results as unknown as T[];
	} catch (error) {
		const duration = Date.now() - startTime;
		trackQuery({
			operation: operationName,
			duration,
			model: model.modelName,
		});
		
		throw new DatabaseError(
			`Batch insert failed: ${operationName}`,
			operationName,
			true,
			{ originalError: error instanceof Error ? error.message : String(error) },
		);
	}
}

/**
 * Batch update operations
 */
export async function batchUpdate<T extends Document>(
	model: Model<T>,
	updates: Array<{
		filter: Record<string, unknown>;
		update: Record<string, unknown>;
	}>,
	operationName = "batchUpdate",
): Promise<number> {
	const startTime = Date.now();
	
	try {
		const bulkOps = updates.map(({ filter, update }) => ({
			updateOne: {
				filter,
				update: { $set: update },
			},
		}));
		
		const result = await model.bulkWrite(bulkOps);
		const duration = Date.now() - startTime;
		
		trackQuery({
			operation: operationName,
			duration,
			model: model.modelName,
		});
		
		logger.info(
			`[DB BATCH] Updated ${result.modifiedCount} documents in ${model.modelName} in ${duration}ms`,
		);
		
		return result.modifiedCount;
	} catch (error) {
		const duration = Date.now() - startTime;
		trackQuery({
			operation: operationName,
			duration,
			model: model.modelName,
		});
		
		throw new DatabaseError(
			`Batch update failed: ${operationName}`,
			operationName,
			true,
			{ originalError: error instanceof Error ? error.message : String(error) },
		);
	}
}

/**
 * Batch delete operations
 */
export async function batchDelete<T extends Document>(
	model: Model<T>,
	filters: Record<string, unknown>[],
	operationName = "batchDelete",
): Promise<number> {
	const startTime = Date.now();
	
	try {
		const bulkOps = filters.map((filter) => ({
			deleteOne: { filter },
		}));
		
		const result = await model.bulkWrite(bulkOps);
		const duration = Date.now() - startTime;
		
		trackQuery({
			operation: operationName,
			duration,
			model: model.modelName,
		});
		
		logger.info(
			`[DB BATCH] Deleted ${result.deletedCount} documents from ${model.modelName} in ${duration}ms`,
		);
		
		return result.deletedCount;
	} catch (error) {
		const duration = Date.now() - startTime;
		trackQuery({
			operation: operationName,
			duration,
			model: model.modelName,
		});
		
		throw new DatabaseError(
			`Batch delete failed: ${operationName}`,
			operationName,
			true,
			{ originalError: error instanceof Error ? error.message : String(error) },
		);
	}
}

/**
 * Common projection patterns
 */
export const projections = {
	// Guild projections
	guildBasic: { guildId: 1, prefix: 1, language: 1 },
	guildConfig: { guildId: 1, prefix: 1, language: 1, theme: 1 },
	
	// User projections
	userBasic: { userId: 1, displayName: 1 },
	spotifyBasic: { userId: 1, spotifyId: 1, displayName: 1, profileImage: 1 },
	lastfmBasic: { userId: 1, lastfmUsername: 1, scrobbleEnabled: 1 },
	
	// Playlist projections
	playlistBasic: { userId: 1, name: 1, tracks: 1 },
	playlistList: { userId: 1, name: 1 }, // Exclude tracks for listing
	
	// Stats projections
	statsBasic: { userId: 1, totalTracksPlayed: 1, totalTimeListened: 1 },
	statsLeaderboard: { userId: 1, totalTracksPlayed: 1 },
	
	// Activity log projections
	activityBasic: { guildId: 1, userId: 1, eventType: 1, timestamp: 1 },
	activityRecent: { guildId: 1, eventType: 1, timestamp: 1, description: 1 },
};


import type Lavamusic from "../structures/Lavamusic";
import Logger from "../structures/Logger";
import { handleError } from "./errors";

const logger = new Logger();

export interface MemoryStats {
	heapUsed: number;
	heapTotal: number;
	external: number;
	rss: number;
	timestamp: number;
}

export interface CacheStats {
	name: string;
	size: number;
	estimatedSize: number; // in bytes
}

export interface MemoryReport {
	overall: {
		heapUsed: number;
		heapTotal: number;
		heapUsedMB: number;
		heapTotalMB: number;
		rssMB: number;
		usagePercent: number;
	};
	caches: CacheStats[];
	collections: Array<{ name: string; size: number }>;
	leakDetected: boolean;
	timestamp: number;
}

// Memory history for leak detection
const memoryHistory: MemoryStats[] = [];
const MAX_HISTORY = 100; // Keep last 100 measurements

/**
 * Get current memory usage
 */
export function getMemoryUsage(): MemoryStats {
	const usage = process.memoryUsage();
	return {
		heapUsed: usage.heapUsed,
		heapTotal: usage.heapTotal,
		external: usage.external,
		rss: usage.rss,
		timestamp: Date.now(),
	};
}

/**
 * Track memory usage for leak detection
 */
export function trackMemoryUsage(): void {
	const usage = getMemoryUsage();
	memoryHistory.push(usage);
	
	// Keep only last MAX_HISTORY entries
	if (memoryHistory.length > MAX_HISTORY) {
		memoryHistory.shift();
	}
}

/**
 * Detect memory leaks by analyzing trend
 */
export function detectMemoryLeak(): boolean {
	if (memoryHistory.length < 20) {
		return false; // Need at least 20 measurements
	}
	
	// Get recent measurements (last 20)
	const recent = memoryHistory.slice(-20);
	const older = memoryHistory.slice(-40, -20);
	
	if (older.length === 0) {
		return false;
	}
	
	// Calculate average heap used
	const recentAvg = recent.reduce((sum, m) => sum + m.heapUsed, 0) / recent.length;
	const olderAvg = older.reduce((sum, m) => sum + m.heapUsed, 0) / older.length;
	
	// If recent average is 20% higher than older average, potential leak
	const increase = ((recentAvg - olderAvg) / olderAvg) * 100;
	
	return increase > 20;
}

/**
 * Get cache statistics from client
 */
export function getCacheStats(client: Lavamusic): CacheStats[] {
	const stats: CacheStats[] = [];
	
	// Commands collection
	if (client.commands) {
		stats.push({
			name: "commands",
			size: client.commands.size,
			estimatedSize: client.commands.size * 5000, // ~5KB per command
		});
	}
	
	// Aliases collection
	if (client.aliases) {
		stats.push({
			name: "aliases",
			size: client.aliases.size,
			estimatedSize: client.aliases.size * 100, // ~100B per alias
		});
	}
	
	// Events collection
	if (client.events) {
		stats.push({
			name: "events",
			size: client.events.size,
			estimatedSize: client.events.size * 3000, // ~3KB per event
		});
	}
	
	// Legacy cooldown collection
	if (client.cooldown) {
		stats.push({
			name: "cooldown (legacy)",
			size: client.cooldown.size,
			estimatedSize: client.cooldown.size * 200, // ~200B per entry
		});
	}
	
	// Event metrics
	if (client.eventMetrics) {
		stats.push({
			name: "eventMetrics",
			size: client.eventMetrics.size,
			estimatedSize: client.eventMetrics.size * 50, // ~50B per entry
		});
	}
	
	// Event errors
	if (client.eventErrors) {
		stats.push({
			name: "eventErrors",
			size: client.eventErrors.size,
			estimatedSize: client.eventErrors.size * 50,
		});
	}
	
	// Event last fired
	if (client.eventLastFired) {
		stats.push({
			name: "eventLastFired",
			size: client.eventLastFired.size,
			estimatedSize: client.eventLastFired.size * 50,
		});
	}
	
	// Event replay buffer
	if (client.eventReplayBuffer) {
		stats.push({
			name: "eventReplayBuffer",
			size: client.eventReplayBuffer.length,
			estimatedSize: client.eventReplayBuffer.length * 500, // ~500B per event
		});
	}
	
	// Cooldown manager
	if (client.cooldownManager) {
		const cooldownSize = Array.from(client.cooldownManager["cooldowns"]?.values() || []).reduce(
			(sum, col) => sum + col.size,
			0,
		);
		stats.push({
			name: "cooldownManager",
			size: cooldownSize,
			estimatedSize: cooldownSize * 100,
		});
	}
	
	// Discord.js caches
	if (client.guilds?.cache) {
		stats.push({
			name: "guilds.cache",
			size: client.guilds.cache.size,
			estimatedSize: client.guilds.cache.size * 10000, // ~10KB per guild
		});
	}
	
	if (client.users?.cache) {
		stats.push({
			name: "users.cache",
			size: client.users.cache.size,
			estimatedSize: client.users.cache.size * 2000, // ~2KB per user
		});
	}
	
	if (client.channels?.cache) {
		stats.push({
			name: "channels.cache",
			size: client.channels.cache.size,
			estimatedSize: client.channels.cache.size * 3000, // ~3KB per channel
		});
	}
	
	return stats;
}

/**
 * Clear expired caches
 */
export function clearExpiredCaches(client: Lavamusic): {
	cleared: number;
	bytesFreed: number;
} {
	let cleared = 0;
	let bytesFreed = 0;
	
	try {
		// Clear event replay buffer if too large
		if (client.eventReplayBuffer && client.eventReplayBuffer.length > 1000) {
			const oldSize = client.eventReplayBuffer.length;
			client.eventReplayBuffer = client.eventReplayBuffer.slice(-1000);
			cleared += oldSize - 1000;
			bytesFreed += (oldSize - 1000) * 500;
		}
		
		// Clear old event metrics (keep only last 1000 entries per map)
		if (client.eventMetrics && client.eventMetrics.size > 1000) {
			const entries = Array.from(client.eventMetrics.entries())
				.sort((a, b) => b[1] - a[1]) // Sort by count
				.slice(0, 1000);
			client.eventMetrics.clear();
			entries.forEach(([key, value]) => client.eventMetrics!.set(key, value));
			cleared += client.eventMetrics.size - 1000;
			bytesFreed += (client.eventMetrics.size - 1000) * 50;
		}
		
		// Clear old event errors (keep only last 500)
		if (client.eventErrors && client.eventErrors.size > 500) {
			const entries = Array.from(client.eventErrors.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, 500);
			client.eventErrors.clear();
			entries.forEach(([key, value]) => client.eventErrors!.set(key, value));
			cleared += client.eventErrors.size - 500;
			bytesFreed += (client.eventErrors.size - 500) * 50;
		}
		
		// Clear old event last fired (keep only last 500)
		if (client.eventLastFired && client.eventLastFired.size > 500) {
			const entries = Array.from(client.eventLastFired.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, 500);
			client.eventLastFired.clear();
			entries.forEach(([key, value]) => client.eventLastFired!.set(key, value));
			cleared += client.eventLastFired.size - 500;
			bytesFreed += (client.eventLastFired.size - 500) * 50;
		}
		
		// Legacy cooldown cleanup (if still used)
		if (client.cooldown && client.cooldown.size > 10000) {
			const oldSize = client.cooldown.size;
			// Clear oldest entries (simple approach: clear all and let it rebuild)
			// In practice, you'd want to track timestamps, but for now just limit size
			const entries = Array.from(client.cooldown.entries()).slice(-5000);
			client.cooldown.clear();
			entries.forEach(([key, value]) => client.cooldown.set(key, value));
			cleared += oldSize - 5000;
			bytesFreed += (oldSize - 5000) * 200;
		}
	} catch (error) {
		handleError(error, {
			client,
			additionalContext: { operation: "clear_expired_caches" },
		});
	}
	
	return { cleared, bytesFreed };
}

/**
 * Force garbage collection (if --expose-gc flag is set)
 */
export function forceGarbageCollection(): boolean {
	if (global.gc) {
		try {
			global.gc();
			return true;
		} catch (error) {
			logger.warn("[MEMORY] Failed to force garbage collection:", error);
			return false;
		}
	}
	return false;
}

/**
 * Get comprehensive memory report
 */
export function getMemoryReport(client: Lavamusic): MemoryReport {
	const usage = getMemoryUsage();
	const caches = getCacheStats(client);
	const leakDetected = detectMemoryLeak();
	
	const collections = [
		{ name: "commands", size: client.commands?.size || 0 },
		{ name: "aliases", size: client.aliases?.size || 0 },
		{ name: "events", size: client.events?.size || 0 },
		{ name: "cooldown (legacy)", size: client.cooldown?.size || 0 },
		{ name: "guilds", size: client.guilds?.cache?.size || 0 },
		{ name: "users", size: client.users?.cache?.size || 0 },
		{ name: "channels", size: client.channels?.cache?.size || 0 },
	];
	
	return {
		overall: {
			heapUsed: usage.heapUsed,
			heapTotal: usage.heapTotal,
			heapUsedMB: Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100,
			heapTotalMB: Math.round((usage.heapTotal / 1024 / 1024) * 100) / 100,
			rssMB: Math.round((usage.rss / 1024 / 1024) * 100) / 100,
			usagePercent: Math.round((usage.heapUsed / usage.heapTotal) * 100 * 100) / 100,
		},
		caches,
		collections,
		leakDetected,
		timestamp: usage.timestamp,
	};
}

/**
 * Log memory report
 */
export function logMemoryReport(client: Lavamusic): void {
	const report = getMemoryReport(client);
	
	logger.info("[MEMORY] Memory Report:");
	logger.info(
		`  Heap: ${report.overall.heapUsedMB}MB / ${report.overall.heapTotalMB}MB (${report.overall.usagePercent}%)`,
	);
	logger.info(`  RSS: ${report.overall.rssMB}MB`);
	logger.info(`  Caches: ${report.caches.length} caches, ${report.caches.reduce((sum, c) => sum + c.size, 0)} total entries`);
	logger.info(`  Collections: ${report.collections.reduce((sum, c) => sum + c.size, 0)} total entries`);
	
	if (report.leakDetected) {
		logger.warn("[MEMORY] ⚠️ Potential memory leak detected!");
	}
	
	// Log top 5 largest caches
	const topCaches = report.caches
		.sort((a, b) => b.estimatedSize - a.estimatedSize)
		.slice(0, 5);
	
	if (topCaches.length > 0) {
		logger.info("  Top caches by size:");
		topCaches.forEach((cache) => {
			logger.info(
				`    ${cache.name}: ${cache.size} entries (~${Math.round(cache.estimatedSize / 1024)}KB)`,
			);
		});
	}
}

/**
 * Memory manager class for automatic management
 */
export class MemoryManager {
	private client: Lavamusic;
	private monitoringInterval: NodeJS.Timeout | null = null;
	private cleanupInterval: NodeJS.Timeout | null = null;
	private enabled: boolean = false;
	
	constructor(client: Lavamusic) {
		this.client = client;
	}
	
	/**
	 * Start memory monitoring
	 */
	public start(monitoringIntervalMs = 60000, cleanupIntervalMs = 300000): void {
		if (this.enabled) {
			logger.warn("[MEMORY] Memory manager already started");
			return;
		}
		
		this.enabled = true;
		
		// Track memory usage every minute
		this.monitoringInterval = setInterval(() => {
			trackMemoryUsage();
			
			// Check for leaks
			if (detectMemoryLeak()) {
				logger.warn("[MEMORY] ⚠️ Memory leak detected! Consider investigating.");
			}
		}, monitoringIntervalMs);
		
		// Cleanup caches every 5 minutes
		this.cleanupInterval = setInterval(() => {
			const result = clearExpiredCaches(this.client);
			if (result.cleared > 0) {
				logger.info(
					`[MEMORY] Cleaned ${result.cleared} cache entries, freed ~${Math.round(result.bytesFreed / 1024)}KB`,
				);
			}
		}, cleanupIntervalMs);
		
		logger.info("[MEMORY] Memory manager started");
	}
	
	/**
	 * Stop memory monitoring
	 */
	public stop(): void {
		if (!this.enabled) {
			return;
		}
		
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = null;
		}
		
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		
		this.enabled = false;
		logger.info("[MEMORY] Memory manager stopped");
	}
	
	/**
	 * Get current status
	 */
	public getStatus(): { enabled: boolean; monitoring: boolean; cleanup: boolean } {
		return {
			enabled: this.enabled,
			monitoring: this.monitoringInterval !== null,
			cleanup: this.cleanupInterval !== null,
		};
	}
}


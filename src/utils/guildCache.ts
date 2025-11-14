import type { Lavamusic } from "../structures/index";
import Logger from "../structures/Logger";

const logger = new Logger();

interface CacheEntry<T> {
	data: T;
	expiresAt: number;
}

interface GuildCacheData {
	setup?: any;
	language?: string;
	dj?: any;
	roles?: any[];
	guild?: any;
}

/**
 * In-memory cache for guild settings to reduce database queries
 * TTL: 5 minutes (300000ms) - balances freshness with performance
 */
export class GuildCache {
	private cache: Map<string, Map<string, CacheEntry<any>>> = new Map();
	private readonly TTL = 5 * 60 * 1000; // 5 minutes
	private readonly MAX_SIZE = 10000; // Maximum number of cached guilds

	/**
	 * Get cached value for a guild
	 */
	get<T>(guildId: string, key: string): T | null {
		const guildCache = this.cache.get(guildId);
		if (!guildCache) return null;

		const entry = guildCache.get(key);
		if (!entry) return null;

		// Check if expired
		if (Date.now() > entry.expiresAt) {
			guildCache.delete(key);
			if (guildCache.size === 0) {
				this.cache.delete(guildId);
			}
			return null;
		}

		return entry.data as T;
	}

	/**
	 * Set cached value for a guild
	 */
	set<T>(guildId: string, key: string, data: T, ttl?: number): void {
		// Cleanup if cache is too large
		if (this.cache.size >= this.MAX_SIZE) {
			this.cleanup();
		}

		if (!this.cache.has(guildId)) {
			this.cache.set(guildId, new Map());
		}

		const guildCache = this.cache.get(guildId)!;
		guildCache.set(key, {
			data,
			expiresAt: Date.now() + (ttl || this.TTL),
		});
	}

	/**
	 * Invalidate cache for a specific guild and key
	 */
	invalidate(guildId: string, key?: string): void {
		if (!key) {
			// Invalidate all keys for this guild
			this.cache.delete(guildId);
			return;
		}

		const guildCache = this.cache.get(guildId);
		if (guildCache) {
			guildCache.delete(key);
			if (guildCache.size === 0) {
				this.cache.delete(guildId);
			}
		}
	}

	/**
	 * Clear expired entries
	 */
	cleanup(): void {
		const now = Date.now();
		let cleaned = 0;

		for (const [guildId, guildCache] of this.cache.entries()) {
			for (const [key, entry] of guildCache.entries()) {
				if (now > entry.expiresAt) {
					guildCache.delete(key);
					cleaned++;
				}
			}

			if (guildCache.size === 0) {
				this.cache.delete(guildId);
			}
		}

		if (cleaned > 0) {
			logger.debug(`[CACHE] Cleaned ${cleaned} expired entries`);
		}
	}

	/**
	 * Get cache statistics
	 */
	getStats(): {
		totalGuilds: number;
		totalEntries: number;
		memoryUsage: number;
	} {
		let totalEntries = 0;
		for (const guildCache of this.cache.values()) {
			totalEntries += guildCache.size;
		}

		// Rough memory estimate (not exact, but useful for monitoring)
		const memoryUsage = this.cache.size * 100 + totalEntries * 200; // bytes

		return {
			totalGuilds: this.cache.size,
			totalEntries,
			memoryUsage,
		};
	}

	/**
	 * Clear all cache
	 */
	clear(): void {
		this.cache.clear();
		logger.info("[CACHE] Cleared all cache");
	}
}

// Singleton instance
let guildCacheInstance: GuildCache | null = null;

/**
 * Get the singleton GuildCache instance
 */
export function getGuildCache(): GuildCache {
	if (!guildCacheInstance) {
		guildCacheInstance = new GuildCache();
		
		// Periodic cleanup every 10 minutes
		setInterval(() => {
			guildCacheInstance?.cleanup();
		}, 10 * 60 * 1000);
	}
	
	return guildCacheInstance;
}


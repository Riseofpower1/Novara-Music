import { Collection } from "discord.js";

export type CooldownScope = "user" | "guild" | "channel" | "global";

export interface CooldownConfig {
	scope: CooldownScope | CooldownScope[];
	duration: number; // in seconds
}

export interface CooldownEntry {
	timestamp: number;
	expiresAt: number;
}

/**
 * Enhanced cooldown manager supporting per-user, per-guild, per-channel, and global cooldowns
 */
export class CooldownManager {
	private cooldowns: Map<string, Collection<string, CooldownEntry>> = new Map();
	private cleanupInterval: NodeJS.Timeout | null = null;

	constructor() {
		// Cleanup expired cooldowns every 5 minutes
		this.cleanupInterval = setInterval(() => {
			this.cleanupExpired();
		}, 5 * 60 * 1000);
	}

	/**
	 * Get cooldown key based on scope
	 */
	private getCooldownKey(
		commandName: string,
		scope: CooldownScope,
		userId: string,
		guildId?: string,
		channelId?: string,
	): string {
		switch (scope) {
			case "user":
				return `${commandName}:user:${userId}`;
			case "guild":
				return `${commandName}:guild:${guildId || "dm"}`;
			case "channel":
				return `${commandName}:channel:${channelId || "dm"}`;
			case "global":
				return `${commandName}:global`;
			default:
				return `${commandName}:user:${userId}`;
		}
	}

	/**
	 * Check if command is on cooldown
	 */
	public isOnCooldown(
		commandName: string,
		config: CooldownConfig,
		userId: string,
		guildId?: string,
		channelId?: string,
	): { onCooldown: boolean; timeLeft?: number } {
		const scopes = Array.isArray(config.scope) ? config.scope : [config.scope];
		const now = Date.now();

		for (const scope of scopes) {
			const key = this.getCooldownKey(commandName, scope, userId, guildId, channelId);
			
			if (!this.cooldowns.has(commandName)) {
				this.cooldowns.set(commandName, new Collection());
			}
			
			const commandCooldowns = this.cooldowns.get(commandName)!;
			const entry = commandCooldowns.get(key);

			if (entry) {
				// Check if expired
				if (now < entry.expiresAt) {
					const timeLeft = Math.ceil((entry.expiresAt - now) / 1000);
					return { onCooldown: true, timeLeft };
				} else {
					// Remove expired entry
					commandCooldowns.delete(key);
				}
			}
		}

		return { onCooldown: false };
	}

	/**
	 * Set cooldown for command
	 */
	public setCooldown(
		commandName: string,
		config: CooldownConfig,
		userId: string,
		guildId?: string,
		channelId?: string,
	): void {
		const scopes = Array.isArray(config.scope) ? config.scope : [config.scope];
		const now = Date.now();
		const cooldownMs = config.duration * 1000;

		if (!this.cooldowns.has(commandName)) {
			this.cooldowns.set(commandName, new Collection());
		}

		const commandCooldowns = this.cooldowns.get(commandName)!;

		for (const scope of scopes) {
			const key = this.getCooldownKey(commandName, scope, userId, guildId, channelId);
			
			commandCooldowns.set(key, {
				timestamp: now,
				expiresAt: now + cooldownMs,
			});

			// Auto-cleanup after cooldown expires
			setTimeout(() => {
				commandCooldowns.delete(key);
			}, cooldownMs);
		}
	}

	/**
	 * Clear cooldown for a specific command and scope
	 */
	public clearCooldown(
		commandName: string,
		scope: CooldownScope,
		userId: string,
		guildId?: string,
		channelId?: string,
	): void {
		const key = this.getCooldownKey(commandName, scope, userId, guildId, channelId);
		const commandCooldowns = this.cooldowns.get(commandName);
		
		if (commandCooldowns) {
			commandCooldowns.delete(key);
		}
	}

	/**
	 * Clear all cooldowns for a command
	 */
	public clearCommandCooldowns(commandName: string): void {
		this.cooldowns.delete(commandName);
	}

	/**
	 * Get remaining cooldown time
	 */
	public getTimeLeft(
		commandName: string,
		config: CooldownConfig,
		userId: string,
		guildId?: string,
		channelId?: string,
	): number {
		const result = this.isOnCooldown(commandName, config, userId, guildId, channelId);
		return result.timeLeft || 0;
	}

	/**
	 * Cleanup expired cooldowns
	 */
	private cleanupExpired(): void {
		const now = Date.now();
		let cleaned = 0;

		for (const [commandName, commandCooldowns] of this.cooldowns.entries()) {
			for (const [key, entry] of commandCooldowns.entries()) {
				if (now >= entry.expiresAt) {
					commandCooldowns.delete(key);
					cleaned++;
				}
			}

			// Remove empty command cooldown maps
			if (commandCooldowns.size === 0) {
				this.cooldowns.delete(commandName);
			}
		}

		if (cleaned > 0) {
			// Logger cleanup notification (optional - can be removed if too verbose)
			// Logger.info(`[COOLDOWN] Cleaned up ${cleaned} expired cooldown entries`);
		}
	}

	/**
	 * Destroy the cooldown manager and cleanup
	 */
	public destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		this.cooldowns.clear();
	}
}


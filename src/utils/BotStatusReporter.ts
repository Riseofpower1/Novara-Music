import axios, { type AxiosRequestConfig } from "axios";
import { type Client, type TextChannel } from "discord.js";
import { env } from "../env";
import Logger from "../structures/Logger";
import { Utils } from "./Utils";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

interface StatusData {
	botId: string;
	name: string;
	servers: number;
	users: number;
	online?: boolean;
	uptime?: string;
}

export class BotStatusReporter {
	private static readonly BOT_STATUS_URL =
		env.BOT_STATUS_URL || "http://localhost:3006/api/bot-status";
	private static readonly BOT_STATUS_TOKEN = env.BOT_STATUS_TOKEN;
	private static readonly statusChannelId = env.BOT_STATUS_CHANNEL_ID;
	private static readonly insecureSSL = env.BOT_STATUS_INSECURE_SSL;
	private static updateInterval: NodeJS.Timeout | null = null;
	private static isOnline: boolean = false;
	private static readonly logger = new Logger();

	// Store last status message ID for editing
	private static lastStatusMessageId: string | null = null;
	
	// Cache file path for persistent storage
	private static readonly CACHE_FILE_PATH = join(process.cwd(), "data", "bot-status-cache.json");

	/**
	 * Get axios config with optional insecure SSL setting
	 */
	private static getAxiosConfig(): AxiosRequestConfig {
		const config: AxiosRequestConfig = {};
		if (this.insecureSSL) {
			config.httpsAgent = {
				rejectUnauthorized: false,
			} as never;
		}
		return config;
	}

	/**
	 * Load cached message ID from file
	 */
	private static loadCachedMessageId(): string | null {
		try {
			if (!existsSync(this.CACHE_FILE_PATH)) {
				this.logger.debug("[BOT STATUS] Cache file does not exist, starting fresh");
				return null;
			}

			const cacheData = JSON.parse(
				readFileSync(this.CACHE_FILE_PATH, "utf-8"),
			) as { messageId?: string; channelId?: string };

			// Verify the cached message ID is for the current channel
			if (
				cacheData.messageId &&
				cacheData.channelId === this.statusChannelId
			) {
				this.logger.debug(
					`[BOT STATUS] Loaded cached message ID: ${cacheData.messageId}`,
				);
				return cacheData.messageId;
			}

			// If channel ID changed, clear the cache
			if (cacheData.channelId && cacheData.channelId !== this.statusChannelId) {
				this.logger.info(
					"[BOT STATUS] Status channel changed, clearing cached message ID",
				);
				this.saveCachedMessageId(null);
				return null;
			}

			return null;
		} catch (error) {
			this.logger.warn(
				"[BOT STATUS] Failed to load cached message ID:",
				error instanceof Error ? error.message : error,
			);
			return null;
		}
	}

	/**
	 * Save message ID to cache file
	 */
	private static saveCachedMessageId(messageId: string | null): void {
		try {
			// Ensure data directory exists
			const dataDir = join(process.cwd(), "data");
			if (!existsSync(dataDir)) {
				mkdirSync(dataDir, { recursive: true });
			}

			const cacheData = {
				messageId,
				channelId: this.statusChannelId,
				lastUpdated: new Date().toISOString(),
			};

			writeFileSync(
				this.CACHE_FILE_PATH,
				JSON.stringify(cacheData, null, 2),
				"utf-8",
			);

			if (messageId) {
				this.logger.debug(
					`[BOT STATUS] Saved message ID to cache: ${messageId}`,
				);
			} else {
				this.logger.debug("[BOT STATUS] Cleared message ID from cache");
			}
		} catch (error) {
			this.logger.warn(
				"[BOT STATUS] Failed to save cached message ID:",
				error instanceof Error ? error.message : error,
			);
		}
	}

	/**
	 * Send or edit a status embed in the status channel
	 */
	static async updateStatusEmbed(
		client: Client,
		statusData: StatusData,
	): Promise<void> {
		try {
			if (!this.statusChannelId) {
				this.logger.warn(
					"[BOT STATUS] Status channel ID not configured, skipping embed update",
				);
				return;
			}

			// Load cached message ID if not already loaded
			if (!this.lastStatusMessageId) {
				this.lastStatusMessageId = this.loadCachedMessageId();
			}

			const channel = await client.channels.fetch(this.statusChannelId);
			if (!channel || !channel.isTextBased()) {
				this.logger.warn(
					`[BOT STATUS] Channel ${this.statusChannelId} not found or not text-based`,
				);
				return;
			}

			const online =
				statusData.online !== undefined ? statusData.online : this.isOnline;
			const statusDot = online ? "🟢" : "🔴";
			const statusText = online ? "Online" : "Offline";
			const color = online ? 0x43b581 : 0xf04747;
			const uptime = Utils.formatUptime(statusData.uptime);

			const embed = {
				color,
				title: "Novara Music Status",
				thumbnail: {
					url: "https://novaraproject.co.uk/logo.png",
				},
				fields: [
					{
						name: "🖥️ Servers",
						value: `${statusData.servers}`,
						inline: true,
					},
					{
						name: "👥 Users",
						value: `${statusData.users}`,
						inline: true,
					},
					{
						name: "🔵 Status",
						value: `${statusDot} ${statusText}`,
						inline: true,
					},
					{
						name: "⏰ Uptime",
						value: uptime,
						inline: false,
					},
				],
				timestamp: new Date().toISOString(),
			};

			// If we have a previous message, try to edit it
			if (this.lastStatusMessageId) {
				try {
					const msg = await channel.messages.fetch(this.lastStatusMessageId);
					await msg.edit({ embeds: [embed] });
					this.logger.debug(
						`[BOT STATUS] Updated existing status message: ${this.lastStatusMessageId}`,
					);
					return;
				} catch (e) {
					// If message not found, clear cache and fall through to send new
					this.logger.debug(
						"[BOT STATUS] Previous message not found, sending new message",
					);
					this.lastStatusMessageId = null;
					this.saveCachedMessageId(null);
				}
			}
			// Otherwise, send a new message and store its ID
			if (channel.isTextBased() && "send" in channel) {
				const sent = await (channel as TextChannel).send({ embeds: [embed] });
				this.lastStatusMessageId = sent.id;
				this.saveCachedMessageId(sent.id);
				this.logger.debug(
					`[BOT STATUS] Sent new status message: ${sent.id}`,
				);
			}
		} catch (err) {
			this.logger.error("[BOT STATUS] Failed to send/edit status embed:", err);
		}
	}

	/**
	 * Test connection to the API endpoint
	 */
	static async testConnection(): Promise<boolean> {
		try {
			this.logger.info(`Testing connection to ${this.BOT_STATUS_URL}...`);
			const config = {
				...this.getAxiosConfig(),
				timeout: 5000,
			};
			const response = await axios.get(this.BOT_STATUS_URL, config);
			this.logger.success(
				`Connection test successful (Status: ${response.status})`,
			);
			return true;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				this.logger.error(`Connection test failed: ${error.message}`);
				if (error.code) {
					this.logger.error(`   Error Code: ${error.code}`);
				}
				if (error.response?.status) {
					this.logger.error(`   HTTP Status: ${error.response.status}`);
				}
			} else {
				this.logger.error("Connection test failed:", error);
			}
			return false;
		}
	}

	/**
	 * Update bot status on the website
	 */
	static async updateStatus(
		statusData: StatusData,
		client?: Client,
	): Promise<boolean> {
		try {
			if (!this.BOT_STATUS_TOKEN) {
				// Bot status reporting is disabled (no token configured)
				return false;
			}

			// Ensure uptime is always a valid string representing milliseconds
			let rawUptime = statusData.uptime;
			if (!rawUptime || Number.isNaN(Number(rawUptime))) {
				if (client && typeof client.uptime === "number") {
					rawUptime = client.uptime.toString();
				} else {
					rawUptime = "0";
				}
			}
			// Format uptime for website
			const formattedUptime = Utils.formatUptime(rawUptime);

			const payload = {
				...statusData,
				online:
					statusData.online !== undefined ? statusData.online : this.isOnline,
				servers: statusData.servers || 0,
				users: statusData.users || 0,
				uptime: formattedUptime,
				token: this.BOT_STATUS_TOKEN,
			};

			this.logger.info(
				`[${statusData.name}] Sending status update - Online: ${payload.online}, Servers: ${payload.servers}`,
			);
			this.logger.debug(`   Full Payload: ${JSON.stringify(payload, null, 2)}`);
			this.logger.debug(`   URL: ${this.BOT_STATUS_URL}`);

			// Send to website API
			const config = {
				...this.getAxiosConfig(),
				timeout: 5000,
				headers: {
					"Content-Type": "application/json",
				},
			};
			const response = await axios.post(this.BOT_STATUS_URL, payload, config);

			this.logger.debug(`Response received - Status: ${response.status}`);
			if (response.status === 200) {
				this.logger.success(
					`[${statusData.name}] Status updated successfully`,
				);
				this.logger.info(
					`   Servers: ${statusData.servers || 0} | Users: ${statusData.users || 0}`,
				);
				// Also update Discord channel embed if client is provided
				if (client) {
					await this.updateStatusEmbed(client, statusData);
				}
				return true;
			}
			this.logger.warn(`Unexpected response status: ${response.status}`);
			return false;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				this.logger.error(
					`[${statusData.name}] Failed to update status:`,
					error.message,
				);
				if (error.response) {
					this.logger.error(
						`   Status: ${error.response.status}`,
						error.response.data,
					);
				} else if (error.request) {
					this.logger.error(
						"   No response received - Request details:",
						error.request,
					);
				} else {
					this.logger.error("   Error setting up request:", error);
				}
			} else {
				this.logger.error(`[${statusData.name}] Unexpected error:`, error);
			}
			return false;
		}
	}

	/**
	 * Set up automatic status updates
	 * @param client - Discord.js client
	 * @param botId - Your bot's Discord ID
	 * @param botName - Your bot's display name
	 * @param intervalMinutes - Update interval in minutes (default: 5)
	 */
	static setupAutoUpdate(
		client: Client,
		botId: string,
		botName: string,
		intervalMinutes: number = 5,
	): NodeJS.Timeout {
		// Load cached message ID on startup
		this.lastStatusMessageId = this.loadCachedMessageId();
		if (this.lastStatusMessageId) {
			this.logger.info(
				`[BOT STATUS] Loaded cached message ID: ${this.lastStatusMessageId}`,
			);
		}
		// Update immediately on startup with explicit online: true
		// Use getTotalUserCount if available (async method)
		const clientWithUserCount = client as Client & {
			getTotalUserCount?: () => Promise<number>;
		};
		if (
			clientWithUserCount.getTotalUserCount &&
			typeof clientWithUserCount.getTotalUserCount === "function"
		) {
			clientWithUserCount
				.getTotalUserCount()
				.then((userCount: number) => {
					this.updateStatus(
						{
							botId,
							name: botName,
							servers: client.guilds.cache.size,
							users: userCount,
							online: true,
							uptime: client.uptime?.toString() || "0",
						},
						client,
					);
				})
				.catch(() => {
					// Fallback to cached users if fetch fails
					this.updateStatus(
						{
							botId,
							name: botName,
							servers: client.guilds.cache.size,
							users: client.users.cache.size,
							online: true,
							uptime: client.uptime?.toString() || "0",
						},
						client,
					);
				});
		} else {
			this.updateStatus(
				{
					botId,
					name: botName,
					servers: client.guilds.cache.size,
					users: client.users.cache.size,
					online: true,
					uptime: client.uptime?.toString() || "0",
				},
				client,
			);
		}

		// Update periodically
		this.updateInterval = setInterval(() => {
			// Only send periodic updates if bot is online
			if (this.isOnline) {
				// Use getTotalUserCount if available
				if (
					clientWithUserCount.getTotalUserCount &&
					typeof clientWithUserCount.getTotalUserCount === "function"
				) {
					clientWithUserCount.getTotalUserCount().then((userCount: number) => {
						this.updateStatus(
							{
								botId,
								name: botName,
								servers: client.guilds.cache.size,
								users: userCount,
								online: true,
								uptime: client.uptime?.toString() || "0",
							},
							client,
						);
					})
					.catch(() => {
						// Fallback to cached users if fetch fails
						this.updateStatus(
							{
								botId,
								name: botName,
								servers: client.guilds.cache.size,
								users: client.users.cache.size,
								online: true,
								uptime: client.uptime?.toString() || "0",
							},
							client,
						);
					});
				} else {
					this.updateStatus(
						{
							botId,
							name: botName,
							servers: client.guilds.cache.size,
							users: client.users.cache.size,
							online: true,
							uptime: client.uptime?.toString() || "0",
						},
						client,
					);
				}
			}
		}, intervalMinutes * 60 * 1000);

		this.logger.info(
			`Auto-update enabled for ${botName} (every ${intervalMinutes} minutes)`,
		);
		return this.updateInterval;
	}

	/**
	 * Stop automatic status updates
	 */
	static stopAutoUpdate(): void {
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
			this.updateInterval = null;
			this.logger.info("Bot status auto-update stopped");
		}
	}

  /**
   * Mark bot as online
   */
  static setOnline(): void {
    this.isOnline = true;
  }

  /**
   * Mark bot as offline
   */
  static setOffline(): void {
    this.isOnline = false;
  }

	/**
	 * Send offline status to website (for shutdown)
	 */
	static async notifyOffline(
		botId: string,
		botName: string,
		servers: number = 0,
		users: number = 0,
	): Promise<boolean> {
		try {
			if (!this.BOT_STATUS_TOKEN) {
				return false;
			}

			const payload = {
				botId,
				name: botName,
				servers,
				users,
				online: false,
				token: this.BOT_STATUS_TOKEN,
			};

			this.logger.info(
				`[${botName}] Sending offline notification to website...`,
			);
			this.logger.debug(`Payload: ${JSON.stringify(payload, null, 2)}`);

			const config = {
				...this.getAxiosConfig(),
				timeout: 10000, // Increased timeout to 10 seconds
				headers: {
					"Content-Type": "application/json",
				},
			};
			const response = await axios.post(this.BOT_STATUS_URL, payload, config);

			this.logger.debug(`Response status: ${response.status}`);
			if (response.status === 200) {
				this.logger.success(`[${botName}] Offline status sent to website`);
				return true;
			}
			return false;
		} catch (error) {
			this.logger.error(
				"Failed to send offline notification:",
				error instanceof Error ? error.message : error,
			);
			return false;
		}
	}
}

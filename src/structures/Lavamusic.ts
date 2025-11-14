/** biome-ignore-all lint/style/noNonNullAssertion: explanation */
import fs from "node:fs";
import path from "node:path";
import {
	ApplicationCommandType,
	Client,
	Collection,
	EmbedBuilder,
	Events,
	type Interaction,
	PermissionsBitField,
	REST,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
	Routes,
} from "discord.js";
import { Locale } from "discord.js";
import config from "../config";
import ServerData from "../database/server";
import { env } from "../env";
import loadPlugins from "../plugin/index";
import { Utils } from "../utils/Utils";
import { T, i18n, initI18n, localization } from "./I18n";
import LavalinkClient from "./LavalinkClient";
import Logger from "./Logger";
import type { Command } from "./index";
import { BotStatusReporter } from "../utils/BotStatusReporter";
import { CooldownManager } from "../utils/cooldownManager";
import { MemoryManager } from "../utils/memoryManager";

export default class Lavamusic extends Client {
	public commands: Collection<string, Command> = new Collection();
	public aliases: Collection<string, string> = new Collection();
	public events: Collection<string, import("./Event").default> = new Collection(); // Event handlers for replay
	public db = new ServerData();
	public cooldown: Collection<string, any> = new Collection(); // Legacy - kept for backward compatibility
	public cooldownManager: CooldownManager = new CooldownManager(); // New enhanced cooldown manager
	public memoryManager: MemoryManager = new MemoryManager(this); // Memory management
	public config = config;
	public logger: Logger = new Logger();
	public readonly emoji = config.emoji;
	public readonly color = config.color;
	private body: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
	public utils = Utils;
	public env: typeof env = env;
	public manager!: LavalinkClient;
	public rest = new REST({ version: "10" }).setToken(env.TOKEN ?? "");
	// Event system enhancements
	public eventMetrics?: Map<string, number> = new Map(); // Event firing counts
	public eventErrors?: Map<string, number> = new Map(); // Event error counts
	public eventLastFired?: Map<string, number> = new Map(); // Last firing timestamp
	public eventReplayBuffer?: import("../utils/eventReplay").EventReplayEntry[] = []; // Event replay buffer
	public embed(): EmbedBuilder {
		return new EmbedBuilder();
	}

	public async start(token: string): Promise<void> {
		const { withStartupErrorBoundary } = await import("../utils/errors");

		// Initialize i18n with error boundary
		await withStartupErrorBoundary(
			async () => {
				initI18n();
			},
			"i18n_initialization",
			this,
		);

		// Start OAuth redirect handler with error boundary
		await withStartupErrorBoundary(
			async () => {
				const { startOAuthHandler } = await import("../oauth/redirectHandler");
				startOAuthHandler();
			},
			"oauth_handler_startup",
			this,
		);

		// Initialize Lavalink client with error boundary
		await withStartupErrorBoundary(
			async () => {
				this.manager = new LavalinkClient(this);
			},
			"lavalink_client_initialization",
			this,
		);

		// Load commands with error boundary
		await withStartupErrorBoundary(
			async () => {
				await this.loadCommands();
				this.logger.info("Successfully loaded commands!");
			},
			"load_commands",
			this,
		);

		// Load events with error boundary
		await withStartupErrorBoundary(
			async () => {
				await this.loadEvents();
				this.logger.info("Successfully loaded events!");
			},
			"load_events",
			this,
		);

		// Load plugins with error boundary
		await withStartupErrorBoundary(
			async () => {
				loadPlugins(this);
			},
			"load_plugins",
			this,
		);

		// Login to Discord (critical - will throw if fails)
		await this.login(token);

		// Start memory management
		this.memoryManager.start();

		// Set up bot status reporting
		let isFirstReady = true;
		this.once(Events.ClientReady, () => {
			this.logger.info("[BOT STATUS] Bot is ready - marking as online");
			BotStatusReporter.setOnline();
			// Test API connection first
			BotStatusReporter.testConnection().then(() => {
				BotStatusReporter.setupAutoUpdate(
					this,
					this.user?.id || env.CLIENT_ID || "",
					"Novara Music",
					5 // Update every 5 minutes
				);
			}).catch(err => {
				this.logger.error("[BOT STATUS] Failed to connect to API:", err);
			});
			isFirstReady = false;
		});

		// Handle disconnections
		this.on(Events.ShardDisconnect, async () => {
			this.logger.warn("[BOT STATUS] Disconnect event fired");
			BotStatusReporter.setOffline();
			
			const botId = this.user?.id || env.CLIENT_ID || "";
			
			this.logger.warn("[BOT STATUS] Sending offline status update immediately");
			// Fire offline update immediately (don't await - fire and forget)
			   BotStatusReporter.updateStatus({
				   botId,
				   name: "Novara Music",
				   servers: 0,
				   users: 0,
				   online: false,
				   uptime: this.uptime?.toString() || "0"
			   }, this).catch(err => this.logger.error("[BOT STATUS] Failed to send offline status:", err));
		});

		// Handle errors
		this.on(Events.Error, (error) => {
			this.logger.error("[BOT STATUS] Client error:", error);
			BotStatusReporter.setOffline();
		});

		// Handle reconnect
		this.on(Events.Invalidated, async () => {
			this.logger.warn("[BOT STATUS] Session invalidated - marking as offline");
			BotStatusReporter.setOffline();
			// Send explicit offline update
			   BotStatusReporter.updateStatus({
				   botId: this.user?.id || env.CLIENT_ID || "",
				   name: "Novara Music",
				   servers: 0,
				   users: 0,
				   online: false,
				   uptime: this.uptime?.toString() || "0"
			   }, this).catch(err => this.logger.error("[BOT STATUS] Failed to send offline status on invalidation:", err));
		});

		// Handle reconnections (after initial ready)
		this.on(Events.ClientReady, async () => {
			if (isFirstReady) return; // Skip on first ready (already handled above)
			this.logger.info("[BOT STATUS] Reconnected - marking as online");
			BotStatusReporter.setOnline();
			// Send immediate update to website
			const userCount = await this.getTotalUserCount();
			   BotStatusReporter.updateStatus({
				   botId: this.user?.id || env.CLIENT_ID || "",
				   name: "Novara Music",
				   servers: this.guilds.cache.size,
				   users: userCount,
				   uptime: this.uptime?.toString() || "0"
			   }, this);
		});

		this.on(Events.InteractionCreate, async (interaction: Interaction) => {
			if (interaction.isButton() && interaction.guildId) {
				const setup = await this.db.getSetup(interaction.guildId);
				if (
					setup &&
					interaction.channelId === setup.textId &&
					interaction.message.id === setup.messageId
				) {
					this.emit("setupButtons", interaction);
				}
			}
		});
	}

	private async loadCommands(): Promise<void> {
		const commandsPath = fs.readdirSync(
			path.join(process.cwd(), "dist", "commands"),
		);

		for (const dir of commandsPath) {
			const commandFiles = fs
				.readdirSync(path.join(process.cwd(), "dist", "commands", dir))
				.filter((file) => file.endsWith(".js"));

			for (const file of commandFiles) {
				const cmdModule = require(
					path.join(process.cwd(), "dist", "commands", dir, file),
				);
				const command: Command = new cmdModule.default(this, file);
				command.category = dir;

				this.commands.set(command.name, command);
				command.aliases.forEach((alias: string) => {
					this.aliases.set(alias, command.name);
				});

				if (command.slashCommand) {
					const data: RESTPostAPIChatInputApplicationCommandsJSONBody = {
						name: command.name,
						description: T(Locale.EnglishUS, command.description.content),
						type: ApplicationCommandType.ChatInput,
						options: command.options || [],
						default_member_permissions:
							Array.isArray(command.permissions.user) &&
							command.permissions.user.length > 0
								? PermissionsBitField.resolve(
										command.permissions.user as (string | bigint)[] as import("discord.js").PermissionResolvable,
									).toString()
								: null,
						name_localizations: null,
						description_localizations: null,
					};

					const localizations: Array<{ name: [Locale, string]; description: [Locale, string] }> = [];
					i18n.getLocales().map((locale: string) => {
						if (locale in Locale) {
							const loc = localization(locale as keyof typeof Locale, command.name, command.description.content);
							localizations.push(loc as { name: [Locale, string]; description: [Locale, string] });
						}
					});

					for (const localization of localizations) {
						const [language, name] = localization.name;
						const [language2, description] = localization.description;
						data.name_localizations = {
							...data.name_localizations,
							[language]: name,
						};
						data.description_localizations = {
							...data.description_localizations,
							[language2]: description,
						};
					}

					if (command.options.length > 0) {
						command.options.map((option) => {
							const optionsLocalizations: Array<{
								name: [Locale, string];
								description: [Locale, string];
							}> = [];
							i18n.getLocales().map((locale: string) => {
								if (locale in Locale) {
									const loc = localization(locale as keyof typeof Locale, option.name, option.description);
									optionsLocalizations.push(loc as { name: [Locale, string]; description: [Locale, string] });
								}
							});

							for (const localization of optionsLocalizations) {
								const [language, name] = localization.name;
								const [language2, description] = localization.description;
								option.name_localizations = {
									...option.name_localizations,
									[language]: name,
								};
								option.description_localizations = {
									...option.description_localizations,
									[language2]: description,
								};
							}
							option.description = T(Locale.EnglishUS, option.description);
						});

						data.options?.map((option) => {
							if ("options" in option && option.options!.length > 0) {
								option.options?.map((subOption) => {
									const subOptionsLocalizations: Array<{
										name: [Locale, string];
										description: [Locale, string];
									}> = [];
									i18n.getLocales().map((locale: string) => {
										if (locale in Locale) {
											const loc = localization(
												locale as keyof typeof Locale,
												subOption.name,
												subOption.description,
											);
											subOptionsLocalizations.push(loc as { name: [Locale, string]; description: [Locale, string] });
										}
									});

									for (const localization of subOptionsLocalizations) {
										const [language, name] = localization.name;
										const [language2, description] = localization.description;
										subOption.name_localizations = {
											...subOption.name_localizations,
											[language]: name,
										};
										subOption.description_localizations = {
											...subOption.description_localizations,
											[language2]: description,
										};
									}
									subOption.description = T(
										Locale.EnglishUS,
										subOption.description,
									);
								});
							}
						});
					}
					this.body.push(data);
				}
			}
		}
	}

	public async deployCommands(guildId?: string): Promise<void> {
		const route = guildId
			? Routes.applicationGuildCommands(this.user?.id ?? "", guildId)
			: Routes.applicationCommands(this.user?.id ?? "");

		try {
			await this.rest.put(route, { body: this.body });
			this.logger.info("Successfully deployed slash commands!");
		} catch (error) {
			this.logger.error(error);
		}
	}

	private async loadEvents(): Promise<void> {
		const eventsPath = fs.readdirSync(
			path.join(process.cwd(), "dist", "events"),
		);

		for (const dir of eventsPath) {
			const eventFiles = fs
				.readdirSync(path.join(process.cwd(), "dist", "events", dir))
				.filter((file) => file.endsWith(".js"));

			for (const file of eventFiles) {
				const eventModule = require(
					path.join(process.cwd(), "dist", "events", dir, file),
				);
				const event = new eventModule.default(this, file);
				
				// Store event for replay functionality
				this.events.set(event.name, event);

				// Wrap event.run with middleware
				const wrappedRun = async (...args: unknown[]) => {
					const { executeEventMiddleware, defaultEventMiddleware } = await import("../utils/eventMiddleware");
					
					try {
						// Execute middleware
						const middlewareResult = await executeEventMiddleware(
							defaultEventMiddleware,
							{
								event,
								client: this,
								eventName: event.name,
								args,
								timestamp: Date.now(),
							},
						);
						
						if (!middlewareResult.success && middlewareResult.stop) {
							return;
						}
						
						// Update last fired timestamp
						if (this.eventLastFired) {
							this.eventLastFired.set(event.name, Date.now());
						}
						
						// Run the actual event handler
						await event.run(...args);
					} catch (error) {
						// Track errors
						if (this.eventErrors) {
							const currentErrors = this.eventErrors.get(event.name) || 0;
							this.eventErrors.set(event.name, currentErrors + 1);
						}
						
						// Handle error
						const { handleError } = await import("../utils/errors");
						handleError(error, {
							client: this,
							additionalContext: {
								operation: "event_execution",
								eventName: event.name,
							},
						});
					}
				};

				if (dir === "player") {
					this.manager.on(event.name, wrappedRun);
				} else if (dir === "node") {
					this.manager.nodeManager.on(event.name, wrappedRun);
				} else {
					this.on(event.name, wrappedRun);
				}
			}
		}
	}

	/**
	 * Get total unique user count across all guilds
	 */
	public async getTotalUserCount(): Promise<number> {
		// Fetch all members from all guilds to ensure we have the most up-to-date count
		const uniqueUsers = new Set<string>();
		let totalFetchedMembers = 0;

		for (const guild of this.guilds.cache.values()) {
			try {
				// Fetch all members in the guild (this will cache them)
				const members = await guild.members.fetch().catch(() => guild.members.cache);
				
				// Add all member IDs to the set
				for (const member of members.values()) {
					uniqueUsers.add(member.id);
				}
				totalFetchedMembers += members.size;
			} catch (err) {
				// If fetch fails, fall back to cached members
				for (const member of guild.members.cache.values()) {
					uniqueUsers.add(member.id);
				}
				totalFetchedMembers += guild.members.cache.size;
			}
		}

		return uniqueUsers.size;
	}
}


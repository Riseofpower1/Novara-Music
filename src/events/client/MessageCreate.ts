/** biome-ignore-all lint/style/noNonNullAssertion: explanation */
import {
	ChannelType,
	EmbedBuilder,
	type GuildMember,
	type Message,
	PermissionFlagsBits,
	type TextChannel,
} from "discord.js";
import { T } from "../../structures/I18n";
import { Context, Event, type Lavamusic } from "../../structures/index";
import {
	formatErrorForUser,
	handleError,
} from "../../utils/errors";

export default class MessageCreate extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: "messageCreate",
		});
	}

	public async run(message: Message): Promise<any> {
		if (message.author.bot) return;
		if (!(message.guild && message.guildId)) return;

		const [setup, locale, guild] = await Promise.all([
			this.client.db.getSetup(message.guildId),
			this.client.db.getLanguage(message.guildId),
			this.client.db.get(message.guildId),
		]);

		if (setup && setup.textId === message.channelId) {
			return this.client.emit("setupSystem", message);
		}
		const mention = new RegExp(`^<@!?${this.client.user?.id}>( |)$`);
		if (mention.test(message.content)) {
			await message.reply({
				content: T(locale, "event.message.prefix_mention", {
					prefix: guild?.prefix,
				}),
			});
			return;
		}

		const escapeRegex = (str: string): string =>
			str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const prefixRegex = new RegExp(
			`^(<@!?${this.client.user?.id}>|${escapeRegex(guild.prefix)})\\s*`,
		);
		if (!prefixRegex.test(message.content)) return;
		const match = message.content.match(prefixRegex);
		if (!match) return;
		const [matchedPrefix] = match;
		const args = message.content
			.slice(matchedPrefix.length)
			.trim()
			.split(/ +/g);
		const cmd = args.shift()?.toLowerCase();
		if (!cmd) return;
		const command =
			this.client.commands.get(cmd) ||
			this.client.commands.get(this.client.aliases.get(cmd) as string);
		if (!command) return;

		const ctx = new Context(message, args);
		ctx.setArgs(args);
		ctx.guildLocale = locale;

		const clientMember = message.guild.members.resolve(this.client.user!)!;
		const isDev = this.client.env.OWNER_IDS?.includes(message.author.id);

		// Check channel-specific permissions
		const channelPermissions = message.channel.permissionsFor(clientMember);
		if (
			!(
				message.inGuild() &&
				channelPermissions?.has(PermissionFlagsBits.ViewChannel)
			)
		)
			return;

		// Check both guild and channel permissions
		if (
			!(
				channelPermissions?.has(PermissionFlagsBits.ViewChannel) &&
				channelPermissions?.has(PermissionFlagsBits.SendMessages) &&
				channelPermissions?.has(PermissionFlagsBits.EmbedLinks) &&
				channelPermissions?.has(PermissionFlagsBits.ReadMessageHistory)
			)
		) {
			// Try to send DM, but don't fail if we can't
			return await message.author
				.send({
					content: T(locale, "event.message.no_send_message"),
				})
				.catch(() => {
					null;
				});
		}

		if (command.permissions) {
			if (command.permissions?.client) {
				const clientRequiredPermissions = Array.isArray(
					command.permissions.client,
				)
					? command.permissions.client
					: [command.permissions.client];

				const missingClientPermissions = clientRequiredPermissions.filter(
					(perm) => !clientMember.permissions.has(perm),
				);

				if (missingClientPermissions.length > 0) {
					return await message.reply({
						content: T(locale, "event.message.no_permission", {
							permissions: missingClientPermissions
								.map((perm: string) => `\`${perm}\``)
								.join(", "),
						}),
					}).catch(() => {
						// Silently fail if we can't send message (missing permissions)
					});
				}
			}

			if (command.permissions?.user) {
				const userRequiredPermissions = Array.isArray(command.permissions.user)
					? command.permissions.user
					: [command.permissions.user];

				if (
					!(
						isDev ||
						(message.member as GuildMember).permissions.has(
							userRequiredPermissions,
						)
					)
				) {
					return await message.reply({
						content: T(locale, "event.message.no_user_permission"),
					}).catch(() => {
						// Silently fail if we can't send message (missing permissions)
					});
				}
			}

			if (command.permissions?.dev && this.client.env.OWNER_IDS) {
				if (!isDev) return;
			}
		}

		if (command.player) {
			if (command.player.voice) {
				if (!(message.member as GuildMember).voice.channel) {
					return await message.reply({
						content: T(locale, "event.message.no_voice_channel", {
							command: command.name,
						}),
					});
				}

				if (!clientMember.permissions.has(PermissionFlagsBits.Connect)) {
					return await message.reply({
						content: T(locale, "event.message.no_connect_permission", {
							command: command.name,
						}),
					});
				}

				if (!clientMember.permissions.has(PermissionFlagsBits.Speak)) {
					return await message.reply({
						content: T(locale, "event.message.no_speak_permission", {
							command: command.name,
						}),
					});
				}

				if (
					(message.member as GuildMember).voice.channel?.type ===
						ChannelType.GuildStageVoice &&
					!clientMember.permissions.has(PermissionFlagsBits.RequestToSpeak)
				) {
					return await message.reply({
						content: T(locale, "event.message.no_request_to_speak", {
							command: command.name,
						}),
					});
				}

				if (
					clientMember.voice.channel &&
					clientMember.voice.channelId !==
						(message.member as GuildMember).voice.channelId
				) {
					return await message.reply({
						content: T(locale, "event.message.different_voice_channel", {
							channel: `<#${clientMember.voice.channelId}>`,
							command: command.name,
						}),
					});
				}
			}

			if (command.player.active) {
				const queue = this.client.manager.getPlayer(message.guildId);
				if (!queue?.queue.current) {
					return await message.reply({
						content: T(locale, "event.message.no_music_playing"),
					});
				}
			}

			if (command.player.dj) {
				const [dj, djRole] = await Promise.all([
					this.client.db.getDj(message.guildId),
					this.client.db.getRoles(message.guildId),
				]);
				if (dj?.mode) {
					// Auto-disable DJ mode if no roles are configured
					if (!djRole || djRole.length === 0) {
						await this.client.db.setDj(message.guildId, false);
						// Allow command to proceed since DJ mode is now disabled
					} else {
						const hasDJRole = (message.member as GuildMember).roles.cache.some(
							(role) => djRole.map((r) => r.roleId).includes(role.id),
						);
						if (
							!(
								isDev ||
								hasDJRole ||
								(message.member as GuildMember).permissions.has(
									PermissionFlagsBits.ManageGuild,
								)
							)
						) {
							return await message.reply({
								content: T(locale, "event.message.no_dj_permission"),
							});
						}
					}
				}
			}
		}

		if (command.args && args.length === 0) {
			const embed = this.client
				.embed()
				.setColor(this.client.color.red)
				.setTitle(T(locale, "event.message.missing_arguments"))
				.setDescription(
					T(locale, "event.message.missing_arguments_description", {
						command: command.name,
						examples: command.description.examples
							? command.description.examples.join("\n")
							: "None",
					}),
				)
				.setFooter({ text: T(locale, "event.message.syntax_footer") });
			await message.reply({ embeds: [embed] });
			return;
		}

		// Enhanced cooldown check using new cooldown manager
		const { normalizeCooldown } = await import("../../utils/commandHelpers");
		const cooldownConfig = normalizeCooldown(command.cooldown);
		const cooldownCheck = this.client.cooldownManager.isOnCooldown(
			command.name,
			cooldownConfig,
			message.author.id,
			message.guildId,
			message.channelId,
		);

		if (cooldownCheck.onCooldown && cooldownCheck.timeLeft) {
			return await message.reply({
				content: T(locale, "event.message.cooldown", {
					time: cooldownCheck.timeLeft.toFixed(1),
					command: cmd,
				}),
			});
		}

		// Set cooldown
		this.client.cooldownManager.setCooldown(
			command.name,
			cooldownConfig,
			message.author.id,
			message.guildId,
			message.channelId,
		);

		if (args.includes("@everyone") || args.includes("@here")) {
			return await message.reply({
				content: T(locale, "event.message.no_mention_everyone"),
			});
		}

		// Execute middleware
		const { executeMiddleware, defaultMiddleware } = await import("../../utils/commandMiddleware");
		const middlewareResult = await executeMiddleware(defaultMiddleware, {
			command,
			client: this.client,
			context: ctx,
			message,
			userId: message.author.id,
			guildId: message.guildId,
			channelId: message.channelId,
		});

		if (!middlewareResult.success && middlewareResult.stop) {
			if (middlewareResult.message) {
				return await message.reply({ content: middlewareResult.message });
			}
			return;
		}

		try {
			return await command.run(this.client, ctx, ctx.args as string[]);
		} catch (error: unknown) {
			// Handle error with proper context
			handleError(error, {
				client: this.client,
				commandName: command.name,
				userId: message.author.id,
				guildId: message.guildId || undefined,
				channelId: message.channelId,
			});

			// Get user-friendly error message
			const userMessage = formatErrorForUser(error);

			// Send error message to user (with error handling for permission errors)
			await message.reply({
				content: T(locale, "event.message.error", {
					error: userMessage,
				}),
			}).catch(() => {
				// Silently fail if we can't send message (missing permissions)
			});
		} finally {
			const logs = this.client.channels.cache.get(
				this.client.env.LOG_COMMANDS_ID!,
			);
			if (logs) {
				const embed = new EmbedBuilder()
					.setAuthor({
						name: "Prefix - Command Logs",
						iconURL: this.client.user?.avatarURL({ size: 2048 })!,
					})
					.setColor(this.client.config.color.green)
					.addFields(
						{ name: "Command", value: `\`${command.name}\``, inline: true },
						{
							name: "User",
							value: `${message.author.tag} (\`${message.author.id}\`)`,
							inline: true,
						},
						{
							name: "Guild",
							value: `${message.guild.name} (\`${message.guild.id}\`)`,
							inline: true,
						},
					)
					.setTimestamp();

				await (logs as TextChannel).send({ embeds: [embed] });
			}
		}
	}
}


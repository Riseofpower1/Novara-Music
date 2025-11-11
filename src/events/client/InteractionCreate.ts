/** biome-ignore-all lint/style/noNonNullAssertion: explanation */
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	Collection,
	EmbedBuilder,
	MessageFlags,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	type GuildMember,
	InteractionType,
	PermissionFlagsBits,
	type TextChannel,
	type Interaction,
	type CacheType,
} from "discord.js";
import { T } from "../../structures/I18n";
import { Context, Event, type Lavamusic } from "../../structures/index";
import { LastfmUser } from "../../database/models";
import { env } from "../../env";
import axios from "axios";
import { spotifyOAuth } from "../../oauth/spotify";
import { lastfmOAuth } from "../../oauth/lastfm";

export default class InteractionCreate extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: "interactionCreate",
		});
	}

	public async run(interaction: Interaction<CacheType>): Promise<any> {
		// Handle button interactions
		if (interaction.isButton()) {
			if (interaction.customId === "lastfm_enter_token") {
				const modal = new ModalBuilder()
					.setCustomId("lastfm_token_modal")
					.setTitle("🎵 Link Your Last.fm Account");

				const tokenInput = new TextInputBuilder()
					.setCustomId("lastfm_token_input")
					.setLabel("Last.fm Authorization Token")
					.setStyle(TextInputStyle.Short)
					.setPlaceholder("Paste the token from the Last.fm authorization page")
					.setRequired(true);

				modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(tokenInput));
				await interaction.showModal(modal);
				return;
			}

			// Handle Spotify code entry button
			if (interaction.customId === "spotify_code_entry") {
				const modal = new ModalBuilder()
					.setCustomId("spotify_code_modal")
					.setTitle("Enter Spotify Authorization Code");

				const codeInput = new TextInputBuilder()
					.setCustomId("spotify_code_input")
					.setLabel("Authorization Code")
					.setStyle(TextInputStyle.Short)
					.setPlaceholder("Paste the code from the Spotify authorization page")
					.setRequired(true);

				modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(codeInput));
				await interaction.showModal(modal);
				return;
			}
		}

		// Handle modal submissions
		if (interaction.isModalSubmit()) {
			// Handle Spotify code submission
			if (interaction.customId === "spotify_code_modal") {
				const code = interaction.fields.getTextInputValue("spotify_code_input");
				
				if (!code || code.length < 10) {
					await interaction.reply({
						embeds: [
							new EmbedBuilder()
								.setColor("#ff0000")
								.setTitle("❌ Invalid Code")
								.setDescription("The code you entered appears to be invalid. Please try again."),
						],
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				await interaction.deferReply({ flags: MessageFlags.Ephemeral });

				try {
					const { SpotifyOAuthService } = await import("../../oauth/spotify");
					const spotifyOAuth = new SpotifyOAuthService();
					
					const { displayName, spotifyId } = await spotifyOAuth.completeOAuthFlow(code, interaction.user.id);

					await interaction.editReply({
						embeds: [
							new EmbedBuilder()
								.setColor("#1DB954")
								.setTitle("✅ Spotify Account Linked!")
								.setDescription(`Your Spotify account **${displayName}** has been successfully linked!\n\nYou can now use Spotify commands like:\n• \`/spotifynow\` - See what you're playing\n• \`/spotifyprofile\` - View your profile stats\n• And more!`),
						],
					});
				} catch (error: any) {
					console.error("Spotify linking error:", error);
					
					// Provide specific error messages based on error type
					let troubleshootingSteps = "**Troubleshooting:**\n";
					if (error.message.includes("invalid_grant")) {
						troubleshootingSteps += "• **Code Expired**: Authorization codes are only valid for 10 minutes\n";
						troubleshootingSteps += "• **Code Already Used**: You may have already pasted this code\n";
						troubleshootingSteps += "• **Credentials Mismatch**: Client ID/Secret may not match Spotify Dashboard\n";
						troubleshootingSteps += "• **Solution**: Get a fresh authorization code by clicking the authorization button again";
					} else if (error.message.includes("User not authorized")) {
						troubleshootingSteps += "• **Not in User Management**: Your Spotify email must be added to the bot's User Management\n";
						troubleshootingSteps += "• Go to: https://developer.spotify.com/dashboard → Your App → User Management\n";
						troubleshootingSteps += "• Add your Spotify account email\n";
						troubleshootingSteps += "• Then try linking again";
					} else if (error.message.includes("Token exchange failed")) {
						troubleshootingSteps += "• **Network Issue**: Connection to Spotify failed\n";
						troubleshootingSteps += "• **Invalid Redirect URI**: Check .env SPOTIFY_REDIRECT_URI matches Spotify Dashboard\n";
						troubleshootingSteps += "• Try again in a moment";
					} else {
						troubleshootingSteps += "• Make sure the code hasn't expired (valid for 10 minutes)\n";
						troubleshootingSteps += "• Check that your Spotify account is in User Management\n";
						troubleshootingSteps += "• Verify your bot's Spotify app credentials";
					}

					await interaction.editReply({
						embeds: [
							new EmbedBuilder()
								.setColor("#ff0000")
								.setTitle("❌ Spotify Linking Failed")
								.setDescription(
									`**Error:** ${error.message}\n\n` +
									troubleshootingSteps
								),
						],
					});
				}
				return;
			}

			if (interaction.customId === "lastfm_token_modal") {
				const token = interaction.fields.getTextInputValue("lastfm_token_input");

				if (!token || token.length < 10) {
					await interaction.reply({
						embeds: [
							new EmbedBuilder()
								.setColor("#ff0000")
								.setTitle("❌ Invalid Token")
								.setDescription("The token you provided is too short. Please try again."),
						],
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				try {
					await interaction.deferReply({ flags: MessageFlags.Ephemeral });

					// Complete Last.fm OAuth flow
					const { username, sessionKey } = await lastfmOAuth.completeOAuthFlow(token, interaction.user.id);

					await interaction.editReply({
						embeds: [
							new EmbedBuilder()
								.setColor("#df212f")
								.setTitle("✅ Last.fm Account Linked Successfully!")
								.setDescription(`Your Last.fm account **${username}** has been linked.\n\nYou can now use Last.fm features in Novara Music.`)
								.addFields(
									{
										name: "Session Key",
										value: `\`${sessionKey.substring(0, 8)}...\``,
										inline: true,
									},
									{
										name: "Username",
										value: username,
										inline: true,
									}
								),
						],
					});
				} catch (error) {
					console.error("[Last.fm Link] Error:", error);

					let troubleshootingSteps = "";

					if (error instanceof Error) {
						if (error.message.includes("Session key")) {
							troubleshootingSteps = "• **Invalid or Expired Token**: The token may have expired (valid for 10 minutes)\n";
							troubleshootingSteps += "• **Try Authorizing Again**: Click the authorization button and complete the process quickly\n";
							troubleshootingSteps += "• **Check Last.fm Account**: Ensure you're authorizing the correct Last.fm account";
						} else if (error.message.includes("user")) {
							troubleshootingSteps = "• **User Info Failed**: Last.fm couldn't retrieve your profile information\n";
							troubleshootingSteps += "• **Account Issue**: Your Last.fm account may have restrictions\n";
							troubleshootingSteps += "• **Try Again**: Click to authorize again with a valid Last.fm account";
						} else {
							troubleshootingSteps = "• **Last.fm Connection Error**: Check your internet connection\n";
							troubleshootingSteps += "• **Try Again**: Wait a moment and try linking again\n";
							troubleshootingSteps += "• **API Issue**: Last.fm service may be temporarily unavailable";
						}
					}

					await interaction.editReply({
						embeds: [
							new EmbedBuilder()
								.setColor("#ff0000")
								.setTitle("❌ Last.fm Linking Failed")
								.setDescription("Unable to complete Last.fm linking. Here's what might have gone wrong:\n\n" + troubleshootingSteps),
						],
					});
				}
				return;
			}

			if (interaction.customId === "lastfm_code_modal") {
				// Last.fm web linking removed - feature requires web server
				await interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setColor("#ff0000")
							.setTitle("❌ Web Server Required")
							.setDescription(
								"Last.fm linking requires the web server component which has been removed.\n\nPlease use the bot for music playback only."
							),
					],
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
		}

		if (!(interaction.guild && interaction.guildId)) return;
		if (
			interaction.type === InteractionType.ApplicationCommand &&
			interaction.isChatInputCommand()
		) {
			const setup = await this.client.db.getSetup(interaction.guildId);
			const allowedCategories = ["filters", "music", "playlist"];
			const commandInSetup = this.client.commands.get(interaction.commandName);
			const locale = await this.client.db.getLanguage(interaction.guildId);

			if (
				setup &&
				interaction.channelId === setup.textId &&
				!(commandInSetup && allowedCategories.includes(commandInSetup.category))
			) {
				return await interaction.reply({
					content: T(locale, "event.interaction.setup_channel"),
					flags: MessageFlags.Ephemeral,
				});
			}

			const { commandName } = interaction;
			await this.client.db.get(interaction.guildId);

			const command = this.client.commands.get(commandName);
			if (!command) return;

			const ctx = new Context(interaction, [...interaction.options.data]);
			ctx.setArgs([...interaction.options.data]);
			ctx.guildLocale = locale;
			const clientMember = interaction.guild.members.resolve(
				this.client.user!,
			)!;
			if (
				!(
					interaction.inGuild() &&
					interaction.channel
						?.permissionsFor(clientMember)
						?.has(PermissionFlagsBits.ViewChannel)
				)
			)
				return;

			if (
				!(
					clientMember.permissions.has(PermissionFlagsBits.ViewChannel) &&
					clientMember.permissions.has(PermissionFlagsBits.SendMessages) &&
					clientMember.permissions.has(PermissionFlagsBits.EmbedLinks) &&
					clientMember.permissions.has(PermissionFlagsBits.ReadMessageHistory)
				)
			) {
				return await (interaction.member as GuildMember)
					.send({
						content: T(locale, "event.interaction.no_send_message"),
					})
					.catch(() => {
						null;
					});
			}

			const logs = this.client.channels.cache.get(
				this.client.env.LOG_COMMANDS_ID!,
			);

			if (command.permissions) {
				if (command.permissions?.client) {
					const clientRequiredPermissions = Array.isArray(
						command.permissions.client,
					)
						? command.permissions.client
						: [command.permissions.client];

					const missingClientPermissions = clientRequiredPermissions.filter(
						(perm: any) => !clientMember.permissions.has(perm),
					);

					if (missingClientPermissions.length > 0) {
						return await interaction.reply({
							content: T(locale, "event.interaction.no_permission", {
								permissions: missingClientPermissions
									.map((perm: string) => `\`${perm}\``)
									.join(", "),
							}),
							flags: MessageFlags.Ephemeral,
						});
					}
				}

				if (
					command.permissions?.user &&
					!(interaction.member as GuildMember).permissions.has(
						command.permissions.user,
					)
				) {
					await interaction.reply({
						content: T(locale, "event.interaction.no_user_permission"),
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				if (command.permissions?.dev && this.client.env.OWNER_IDS) {
					const isDev = this.client.env.OWNER_IDS.includes(interaction.user.id);
					if (!isDev) return;
				}
			}
			if (command.player) {
				if (command.player.voice) {
					if (!(interaction.member as GuildMember).voice.channel) {
						return await interaction.reply({
							content: T(locale, "event.interaction.no_voice_channel", {
								command: command.name,
							}),
						});
					}

					if (!clientMember.permissions.has(PermissionFlagsBits.Connect)) {
						return await interaction.reply({
							content: T(locale, "event.interaction.no_connect_permission", {
								command: command.name,
							}),
						});
					}

					if (!clientMember.permissions.has(PermissionFlagsBits.Speak)) {
						return await interaction.reply({
							content: T(locale, "event.interaction.no_speak_permission", {
								command: command.name,
							}),
						});
					}

					if (
						(interaction.member as GuildMember).voice.channel?.type ===
							ChannelType.GuildStageVoice &&
						!clientMember.permissions.has(PermissionFlagsBits.RequestToSpeak)
					) {
						return await interaction.reply({
							content: T(locale, "event.interaction.no_request_to_speak", {
								command: command.name,
							}),
						});
					}

					if (
						clientMember.voice.channel &&
						clientMember.voice.channelId !==
							(interaction.member as GuildMember).voice.channelId
					) {
						return await interaction.reply({
							content: T(locale, "event.interaction.different_voice_channel", {
								channel: `<#${clientMember.voice.channelId}>`,
								command: command.name,
							}),
						});
					}
				}

				if (command.player.active) {
					const queue = this.client.manager.getPlayer(interaction.guildId);
					if (!queue?.queue.current) {
						return await interaction.reply({
							content: T(locale, "event.interaction.no_music_playing"),
						});
					}
				}

				if (command.player.dj) {
					const dj = await this.client.db.getDj(interaction.guildId);
					if (dj?.mode) {
						const djRole = await this.client.db.getRoles(interaction.guildId);
						if (!djRole) {
							return await interaction.reply({
								content: T(locale, "event.interaction.no_dj_role"),
							});
						}

						const hasDJRole = (
							interaction.member as GuildMember
						).roles.cache.some((role) =>
							djRole.map((r) => r.roleId).includes(role.id),
						);
						if (
							!(
								hasDJRole &&
								!(interaction.member as GuildMember).permissions.has(
									PermissionFlagsBits.ManageGuild,
								)
							)
						) {
							return await interaction.reply({
								content: T(locale, "event.interaction.no_dj_permission"),
								flags: MessageFlags.Ephemeral,
							});
						}
					}
				}
			}

			if (!this.client.cooldown.has(commandName)) {
				this.client.cooldown.set(commandName, new Collection());
			}

			const now = Date.now();
			const timestamps = this.client.cooldown.get(commandName)!;
			const cooldownAmount = (command.cooldown || 5) * 1000;

			if (timestamps.has(interaction.user.id)) {
				const expirationTime =
					timestamps.get(interaction.user.id)! + cooldownAmount;
				const timeLeft = (expirationTime - now) / 1000;
				if (now < expirationTime && timeLeft > 0.9) {
					return await interaction.reply({
						content: T(locale, "event.interaction.cooldown", {
							time: timeLeft.toFixed(1),
							command: commandName,
						}),
					});
				}
				timestamps.set(interaction.user.id, now);
				setTimeout(
					() => timestamps.delete(interaction.user.id),
					cooldownAmount,
				);
			} else {
				timestamps.set(interaction.user.id, now);
				setTimeout(
					() => timestamps.delete(interaction.user.id),
					cooldownAmount,
				);
			}

			try {
				await command.run(this.client, ctx, ctx.args);
				if (
					setup &&
					interaction.channelId === setup.textId &&
					allowedCategories.includes(command.category)
				) {
					setTimeout(() => {
						interaction.deleteReply().catch(() => {
							null;
						});
					}, 5000);
				}
				if (logs) {
					const embed = new EmbedBuilder()
						.setAuthor({
							name: "Slash - Command Logs",
							iconURL: this.client.user?.avatarURL({ size: 2048 })!,
						})
						.setColor(this.client.config.color.blue)
						.addFields(
							{ name: "Command", value: `\`${command.name}\``, inline: true },
							{
								name: "User",
								value: `${interaction.user.tag} (\`${interaction.user.id}\`)`,
								inline: true,
							},
							{
								name: "Guild",
								value: `${interaction.guild.name} (\`${interaction.guild.id}\`)`,
								inline: true,
							},
						)
						.setTimestamp();

					await (logs as TextChannel).send({ embeds: [embed] });
				}
			} catch (error) {
				this.client.logger.error(error);
				await interaction.reply({
					content: T(locale, "event.interaction.error", { error }),
				});
			}
		} else if (
			interaction.type === InteractionType.ApplicationCommandAutocomplete
		) {
			const command = this.client.commands.get(interaction.commandName);
			if (!command) return;

			try {
				await command.autocomplete(interaction);
			} catch (error) {
				this.client.logger.error(error);
			}
		}
	}
}


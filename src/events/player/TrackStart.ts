import {
	type ButtonInteraction,
	type ChannelSelectMenuInteraction,
	GuildMember,
	type MentionableSelectMenuInteraction,
	PermissionFlagsBits,
	MessageFlags,
	type RoleSelectMenuInteraction,
	type StringSelectMenuInteraction,
	type TextChannel,
	type UserSelectMenuInteraction,
	EmbedBuilder,
} from "discord.js";
import type { Player, Track, TrackStartEvent } from "lavalink-client";
import { T } from "../../structures/I18n";
import { Event, type Lavamusic } from "../../structures/index";
import type { Requester } from "../../types";
import { trackStart } from "../../utils/SetupSystem";
import { AnalyticsService } from "../../database/analytics";
import { getButtons } from "../../utils/Buttons";

export default class TrackStart extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: "trackStart",
		});
	}

	public async run(
		player: Player,
		track: Track | null,
		_payload: TrackStartEvent,
	): Promise<void> {
		const guild = this.client.guilds.cache.get(player.guildId);
		if (!guild) return;
		if (!player.textChannelId) return;
		if (!track) return;
		const channel = guild.channels.cache.get(
			player.textChannelId,
		) as TextChannel;
		if (!channel) return;

		// Track play analytics
		const analyticsService = new AnalyticsService();
		const requester = track.requester as Requester;
		
		// Store requester ID for pause/queue end tracking
		player.set("lastPlayedBy", requester.id || "unknown");
		
		await analyticsService.trackPlay(
			requester.id || "unknown",
			player.guildId,
			track.info.title,
			track.info.author,
			track.info.duration,
			track.info.sourceName || "unknown"
		).catch((err) => {
			this.client.logger.error("Failed to track play analytics:", err);
		});

		this.client.utils.updateStatus(this.client, guild.id);

		const locale = await this.client.db.getLanguage(guild.id);

		if (player.voiceChannelId) {
			await this.client.utils.setVoiceStatus(
				this.client,
				player.voiceChannelId,
				`🎵 ${track.info.title}`,
			);
		}

		// Format loop mode display
		const loopModeDisplay = 
			player.repeatMode === "off" 
				? "Off" 
				: player.repeatMode === "track" 
					? "🎵 Track" 
					: "📝 Queue";

		// Get next track preview
		const nextTrack = player.queue.tracks[0];
		const nextTrackPreview = nextTrack 
			? `**[${nextTrack.info.title}](${nextTrack.info.uri})**\n${nextTrack.info.author || "Unknown"}`
			: "No tracks in queue";

		// Enhanced description with better formatting
		const description = `🎵 **[${track.info.title}](${track.info.uri})**\n🎤 ${track.info.author || "Unknown"}`;

		// Initial progress bar (will be updated by interval)
		const initialProgressBar = this.client.utils.progressBar(0, track.info.duration, 20);
		const initialTime = `${this.client.utils.formatTime(0)} / ${this.client.utils.formatTime(track.info.duration)}`;

		const embed = this.client
			.embed()
			.setAuthor({
				name: T(locale, "player.trackStart.now_playing"),
				iconURL:
					this.client.config.icons[track.info.sourceName] ??
					this.client.user?.displayAvatarURL({ extension: "png" }),
			})
			.setColor(this.client.color.main)
			.setDescription(description)
			.setThumbnail(track.info.artworkUrl || this.client.user?.displayAvatarURL({ extension: "png" }) || null)
			.setFooter({
				text: T(locale, "player.trackStart.requested_by", {
					user: (track.requester as Requester).username,
				}),
				iconURL: (track.requester as Requester).avatarURL,
			})
			.addFields(
				{
					name: "🎚️ Progress",
					value: `\`${initialProgressBar}\`\n\`${initialTime}\``,
					inline: false,
				},
				{
					name: "⏱️ " + T(locale, "player.trackStart.duration"),
					value: track.info.isStream
						? "🔴 LIVE STREAM"
						: this.client.utils.formatTime(track.info.duration),
					inline: true,
				},
				{
					name: "🔊 Volume",
					value: `${player.volume}%`,
					inline: true,
				},
				{
					name: "🔄 Loop Mode",
					value: loopModeDisplay,
					inline: true,
				},
				{
					name: "📊 Queue",
					value: `${player.queue.tracks.length} track${player.queue.tracks.length !== 1 ? "s" : ""} waiting`,
					inline: true,
				},
				{
					name: "📍 Source",
					value: track.info.sourceName 
						? track.info.sourceName.charAt(0).toUpperCase() + track.info.sourceName.slice(1)
						: "Unknown",
					inline: true,
				},
				{
					name: "⏭️ Next Up",
					value: nextTrackPreview,
					inline: false,
				}
			)
			.setTimestamp();

		const setup = await this.client.db.getSetup(guild.id);

		if (setup?.textId) {
			const textChannel = guild.channels.cache.get(setup.textId) as TextChannel;
			if (textChannel) {
				await trackStart(
					setup.messageId,
					textChannel,
					player,
					track,
					this.client,
					locale,
				);
			}
		} else {
			const message = await channel.send({
				embeds: [embed],
				components: getButtons(player, this.client),
			});

			player.set("messageId", message.id);
			createCollector(message, player, track, embed, this.client, locale);
		}
	}
}

function createCollector(
	message: any,
	player: Player,
	_track: Track,
	embed: any,
	client: Lavamusic,
	locale: string,
): void {
	const collector = message.createMessageComponentCollector({
		filter: async (b: ButtonInteraction) => {
			if (b.member instanceof GuildMember) {
				const isSameVoiceChannel =
					b.guild?.members.me?.voice.channelId === b.member.voice.channelId;
				if (isSameVoiceChannel) return true;
			}
			await b.reply({
				content: T(locale, "player.trackStart.not_connected_to_voice_channel", {
					channel: b.guild?.members.me?.voice.channelId ?? "None",
				}),
				flags: MessageFlags.Ephemeral,
			});
			return false;
		},
	});

	// Set up progress bar update interval
	const progressInterval = setInterval(async () => {
		try {
			if (!player.queue.current) {
				clearInterval(progressInterval);
				return;
			}

			const duration = player.queue.current.info.duration;
			const position = player.position;
			const remaining = Math.max(0, duration - position);
			
			// Use the existing progressBar utility with 20 segments
			const progressBar = client.utils.progressBar(position, duration, 20);
			
			// Format time display
			const currentTime = client.utils.formatTime(position);
			const totalTime = client.utils.formatTime(duration);
			const remainingTime = client.utils.formatTime(remaining);
			const timeDisplay = `${currentTime} / ${totalTime} • ${remainingTime} remaining`;

			// Update loop mode display
			const loopModeDisplay = 
				player.repeatMode === "off" 
					? "Off" 
					: player.repeatMode === "track" 
						? "🎵 Track" 
						: "📝 Queue";

			// Get next track preview
			const nextTrack = player.queue.tracks[0];
			const nextTrackPreview = nextTrack 
				? `**[${nextTrack.info.title}](${nextTrack.info.uri})**\n${nextTrack.info.author || "Unknown"}`
				: "No tracks in queue";

			// Update buttons to reflect current state
			const updatedButtons = getButtons(player, client);

			// Update the embed with new progress and current player state
			const updatedEmbed = new EmbedBuilder(embed.data)
				.spliceFields(0, 7, 
					{
						name: "🎚️ Progress",
						value: `\`${progressBar}\`\n\`${timeDisplay}\``,
						inline: false,
					},
					{
						name: "⏱️ " + T(locale, "player.trackStart.duration"),
						value: player.queue.current.info.isStream
							? "🔴 LIVE STREAM"
							: client.utils.formatTime(duration),
						inline: true,
					},
					{
						name: "🔊 Volume",
						value: `${player.volume}%`,
						inline: true,
					},
					{
						name: "🔄 Loop Mode",
						value: loopModeDisplay,
						inline: true,
					},
					{
						name: "📊 Queue",
						value: `${player.queue.tracks.length} track${player.queue.tracks.length !== 1 ? "s" : ""} waiting`,
						inline: true,
					},
					{
						name: "📍 Source",
						value: player.queue.current.info.sourceName 
							? player.queue.current.info.sourceName.charAt(0).toUpperCase() + player.queue.current.info.sourceName.slice(1)
							: "Unknown",
						inline: true,
					},
					{
						name: "⏭️ Next Up",
						value: nextTrackPreview,
						inline: false,
					}
				);

			await message.edit({ 
				embeds: [updatedEmbed],
				components: updatedButtons,
			}).catch(() => {
				clearInterval(progressInterval);
			});
		} catch (error) {
			clearInterval(progressInterval);
		}
	}, 2000); // Update every 2 seconds

	collector.on("collect", async (interaction: ButtonInteraction<"cached">) => {
		if (!(await checkDj(client, interaction))) {
			await interaction.reply({
				content: T(locale, "player.trackStart.need_dj_role"),
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const editMessage = async (text: string): Promise<void> => {
			if (message) {
				await message.edit({
					embeds: [
						embed.setFooter({
							text,
							iconURL: interaction.user.avatarURL({}),
						}),
					],
					components: getButtons(player, client),
				});
			}
		};
		switch (interaction.customId) {
			case "PREV_BUT":
			case "previous": {
				if (!player.queue.previous) {
					await interaction.reply({
						content: T(locale, "player.trackStart.no_previous_song"),
						flags: MessageFlags.Ephemeral,
					});
					return;
				}
				await interaction.deferUpdate();
				const previousTrack = player.queue.previous[0];
				player.play({
					track: previousTrack,
				});
				await editMessage(
					T(locale, "player.trackStart.previous_by", {
						user: interaction.user.tag,
					}),
				);
				break;
			}
			case "PAUSE_BUT":
			case "resume": {
				await interaction.deferUpdate();
				if (player.paused) {
					player.resume();
					await editMessage(
						T(locale, "player.trackStart.resumed_by", {
							user: interaction.user.tag,
						}),
					);
				} else {
					player.pause();
					await editMessage(
						T(locale, "player.trackStart.paused_by", {
							user: interaction.user.tag,
						}),
					);
				}
				break;
			}
			case "SKIP_BUT":
			case "skip": {
				if (player.queue.tracks.length === 0) {
					await interaction.reply({
						content: T(locale, "player.trackStart.no_more_songs_in_queue"),
						flags: MessageFlags.Ephemeral,
					});
					return;
				}
				await interaction.deferUpdate();
				player.skip();
				await editMessage(
					T(locale, "player.trackStart.skipped_by", {
						user: interaction.user.tag,
					}),
				);
				break;
			}
			case "LOOP_BUT":
			case "loop": {
				await interaction.deferUpdate();
				switch (player.repeatMode) {
					case "off": {
						player.setRepeatMode("track");
						await editMessage(
							T(locale, "player.trackStart.looping_by", {
								user: interaction.user.tag,
							}),
						);
						break;
					}
					case "track": {
						player.setRepeatMode("queue");
						await editMessage(
							T(locale, "player.trackStart.looping_queue_by", {
								user: interaction.user.tag,
							}),
						);
						break;
					}
					case "queue": {
						player.setRepeatMode("off");
						await editMessage(
							T(locale, "player.trackStart.looping_off_by", {
								user: interaction.user.tag,
							}),
						);
						break;
					}
				}
				break;
			}
			case "STOP_BUT":
			case "stop": {
				await interaction.deferUpdate();
				player.stopPlaying(true, false);
				break;
			}
			case "SHUFFLE_BUT": {
				await interaction.deferUpdate();
				player.queue.shuffle();
				await editMessage(
					`🔀 ${T(locale, "player.trackStart.shuffled_by", {
						user: interaction.user.tag,
					})}`,
				);
				break;
			}
			case "AUTOPLAY_BUT": {
				await interaction.deferUpdate();
				const autoplay = player.get<boolean>("autoplay");
				player.set("autoplay", !autoplay);
				await editMessage(
					T(locale, autoplay ? "cmd.autoplay.messages.disabled" : "cmd.autoplay.messages.enabled"),
				);
				break;
			}
		}
	});

	// Clean up interval when collector ends
	collector.on("end", () => {
		clearInterval(progressInterval);
	});
}

export async function checkDj(
	client: Lavamusic,
	interaction:
		| ButtonInteraction<"cached">
		| StringSelectMenuInteraction<"cached">
		| UserSelectMenuInteraction<"cached">
		| RoleSelectMenuInteraction<"cached">
		| MentionableSelectMenuInteraction<"cached">
		| ChannelSelectMenuInteraction<"cached">,
): Promise<boolean> {
	const dj = await client.db.getDj(interaction.guildId);
	if (dj?.mode) {
		const djRole = await client.db.getRoles(interaction.guildId);
		if (!djRole) return false;
		const hasDjRole = interaction.member.roles.cache.some((role) =>
			djRole.map((r) => r.roleId).includes(role.id),
		);
		if (
			!(
				hasDjRole ||
				interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
			)
		) {
			return false;
		}
	}
	return true;
}


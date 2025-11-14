import type { TextChannel } from "discord.js";
import type { Player } from "lavalink-client";
import { Event, type Lavamusic } from "../../structures/index";
import { updateSetup } from "../../utils/SetupSystem";
import { AnalyticsService } from "../../database/analytics";
import { handleError } from "../../utils/errors";

export default class PlayerDestroy extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: "playerDestroy",
		});
	}

	public async run(player: Player, _reason: string): Promise<void> {
		try {
			const guild = this.client.guilds.cache.get(player.guildId);
			if (!guild) return;

			const locale = await this.client.db.getLanguage(player.guildId);
			await updateSetup(this.client, guild, locale);

			// Log player destroy event for analytics
			const analyticsService = new AnalyticsService();
			const currentUserId = player.get<string | undefined>("lastPlayedBy") || "unknown";

			await analyticsService
				.logActivity(player.guildId, currentUserId, "player_destroyed", {
					reason: _reason || "unknown",
					timestamp: new Date().toISOString(),
				})
				.catch((err) => {
					handleError(err, {
						client: this.client,
						guildId: player.guildId,
						additionalContext: { operation: "analytics_log_destroy" },
					});
				});

			const voiceChannelId =
				player.voiceChannelId ?? player.options.voiceChannelId;

			if (voiceChannelId) {
				await this.client.utils.setVoiceStatus(this.client, voiceChannelId, "");
			}

			const messageId = player.get<string | undefined>("messageId");
			if (!messageId) return;

			const channel = guild.channels.cache.get(
				player.textChannelId!,
			) as TextChannel;
			if (!channel) return;

			const message = await channel.messages.fetch(messageId).catch(() => null);
			if (!message) return;

			if (message.editable) {
				await message.edit({ components: [] }).catch((err) => {
					handleError(err, {
						client: this.client,
						guildId: player.guildId,
						channelId: channel.id,
						additionalContext: { operation: "edit_message_on_destroy" },
					});
				});
			}
		} catch (error) {
			handleError(error, {
				client: this.client,
				guildId: player.guildId,
				additionalContext: {
					operation: "player_destroy",
					reason: _reason,
				},
			});
		}
	}
}


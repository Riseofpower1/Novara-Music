import type { Player, Track } from "lavalink-client";
import { Event, type Lavamusic } from "../../structures/index";
import { AnalyticsService } from "../../database/analytics";

export default class PlayerPaused extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: "playerPaused",
		});
	}

	public async run(player: Player, track: Track): Promise<void> {
		if (!player || !track) return;

		if (player.voiceChannelId) {
			await this.client.utils.setVoiceStatus(
				this.client,
				player.voiceChannelId,
				`⏸️ ${track.info.title}`,
			);
		}

		// Log pause event for analytics - helps track user listening patterns
		const analyticsService = new AnalyticsService();
		const currentUserId = player.get<string | undefined>("lastPlayedBy") || "unknown";
		const pausedAt = new Date();
		player.set("pausedAt", pausedAt.getTime());
		
		await analyticsService.logActivity(player.guildId, currentUserId, "track_paused", {
			track: track.info.title,
			artist: track.info.author,
			timestamp: pausedAt.toISOString()
		}).catch((err) => {
			this.client.logger.error("Failed to log pause event:", err);
		});
	}
}


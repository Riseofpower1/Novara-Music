import type { Player, Track } from "lavalink-client";
import { Event, type Lavamusic } from "../../structures/index";
import { AnalyticsService } from "../../database/analytics";

export default class PlayerResumed extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: "playerResumed",
		});
	}

	public async run(player: Player, track: Track): Promise<void> {
		if (!player || !track) return;

		if (player.voiceChannelId) {
			await this.client.utils.setVoiceStatus(
				this.client,
				player.voiceChannelId,
				`🎵 ${track.info.title}`,
			);
		}

		// Log track resumed event for analytics
		const analyticsService = new AnalyticsService();
		const currentUserId = player.get<string | undefined>("lastPlayedBy") || "unknown";
		
		// Clear pause timestamp since playback resumed
		player.set("pausedAt", 0);
		
		await analyticsService.logActivity(player.guildId, currentUserId, "track_resumed", {
			track: track.info.title,
			artist: track.info.author,
			timestamp: new Date().toISOString()
		}).catch((err) => {
			this.client.logger.error("Failed to log resume event:", err);
		});
	}
}


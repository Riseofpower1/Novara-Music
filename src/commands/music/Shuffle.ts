import { Command, type Context, type Lavamusic } from "../../structures/index";
import { AnalyticsService } from "../../database/analytics";
import {
	ACTIVE_DJ_PLAYER_CONFIG,
	createMusicCommandPermissions,
} from "../../utils/commandHelpers";

export default class Shuffle extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "shuffle",
			description: {
				content: "cmd.shuffle.description",
				examples: ["shuffle"],
				usage: "shuffle",
			},
			category: "music",
			aliases: ["sh"],
			cooldown: 3,
			args: false,
			player: ACTIVE_DJ_PLAYER_CONFIG,
			permissions: createMusicCommandPermissions(),
			slashCommand: true,
			options: [],
		});
	}

	public async run(client: Lavamusic, ctx: Context): Promise<any> {
		const player = client.manager.getPlayer(ctx.guild.id);
		const embed = this.client.embed();
		if (!player)
			return await ctx.sendMessage(
				ctx.locale("event.message.no_music_playing"),
			);
		if (player.queue.tracks.length === 0) {
			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(this.client.color.red)
						.setDescription(ctx.locale("player.errors.no_song")),
				],
			});
		}

		const fairPlay = player.get<boolean>("fairplay");
		if (fairPlay) {
			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(this.client.color.red)
						.setDescription(ctx.locale("cmd.shuffle.errors.fairplay")),
				],
			});
		}

		player.queue.shuffle();
		
		// Log shuffle event for analytics
		if (ctx.author) {
			const analyticsService = new AnalyticsService();
			const queueSize = player.queue.tracks.length;
			await analyticsService.logActivity(ctx.guild.id, ctx.author.id, "queue_shuffled", {
			queueSize: queueSize,
			timestamp: new Date().toISOString()
			}).catch((err) => {
				this.client.logger.error("Failed to log shuffle command:", err);
			});
		}
		
		return await ctx.sendMessage({
			embeds: [
				embed
					.setColor(this.client.color.main)
					.setDescription(ctx.locale("cmd.shuffle.messages.shuffled")),
			],
		});
	}
}


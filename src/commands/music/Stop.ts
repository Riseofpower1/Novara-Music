import { Command, type Context, type Lavamusic } from "../../structures/index";
import { AnalyticsService } from "../../database/analytics";
import {
	ACTIVE_DJ_PLAYER_CONFIG,
	createMusicCommandPermissions,
} from "../../utils/commandHelpers";

export default class Stop extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "stop",
			description: {
				content: "cmd.stop.description",
				examples: ["stop"],
				usage: "stop",
			},
			category: "music",
			aliases: ["sp"],
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
		
		// Log stop command for analytics
		if (ctx.author) {
			const analyticsService = new AnalyticsService();
			const currentTrack = player.queue.current?.info;
			await analyticsService.logActivity(ctx.guild.id, ctx.author.id, "stop_command", {
			track: currentTrack?.title,
			artist: currentTrack?.author,
			timestamp: new Date().toISOString()
			}).catch((err) => {
				this.client.logger.error("Failed to log stop command:", err);
			});
		}
		
		player.stopPlaying(true, false);

		return await ctx.sendMessage({
			embeds: [
				embed
					.setColor(this.client.color.main)
					.setDescription(ctx.locale("cmd.stop.messages.stopped")),
			],
		});
	}
}


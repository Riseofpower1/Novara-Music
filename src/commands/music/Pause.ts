import { Command, type Context, type Lavamusic } from "../../structures/index";
import { AnalyticsService } from "../../database/analytics";

export default class Pause extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "pause",
			description: {
				content: "cmd.pause.description",
				examples: ["pause"],
				usage: "pause",
			},
			category: "music",
			aliases: ["pu"],
			cooldown: 3,
			args: false,
			player: {
				voice: true,
				dj: false,
				active: true,
				djPerm: null,
			},
			permissions: {
				dev: false,
				client: [
					"SendMessages",
					"ReadMessageHistory",
					"ViewChannel",
					"EmbedLinks",
				],
				user: [],
			},
			slashCommand: true,
			options: [],
		});
	}

	public async run(client: Lavamusic, ctx: Context): Promise<any> {
		const player = client.manager.getPlayer(ctx.guild.id);
		const embed = this.client.embed();

		if (player?.paused) {
			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(this.client.color.red)
						.setDescription(ctx.locale("player.errors.already_paused")),
				],
			});
		}

		player?.pause();

		// Log pause command for analytics
		const analyticsService = new AnalyticsService();
		const currentTrack = player?.queue.current?.info;
		await analyticsService.logActivity(ctx.guild.id, ctx.author.id, "pause_command", {
			track: currentTrack?.title,
			artist: currentTrack?.author,
			timestamp: new Date().toISOString()
		}).catch((err) => {
			this.client.logger.error("Failed to log pause command:", err);
		});

		return await ctx.sendMessage({
			embeds: [
				embed
					.setColor(this.client.color.main)
					.setDescription(ctx.locale("cmd.pause.successfully_paused")),
			],
		});
	}
}


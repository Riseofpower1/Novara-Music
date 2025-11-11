import { Command, type Context, type Lavamusic } from "../../structures/index";
import { AnalyticsService } from "../../database/analytics";

export default class Resume extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "resume",
			description: {
				content: "cmd.resume.description",
				examples: ["resume"],
				usage: "resume",
			},
			category: "music",
			aliases: ["r"],
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
		if (!player)
			return await ctx.sendMessage(
				ctx.locale("event.message.no_music_playing"),
			);
		if (!player.paused) {
			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(this.client.color.red)
						.setDescription(ctx.locale("cmd.resume.errors.not_paused")),
				],
			});
		}

		player.resume();
		
		// Log resume command for analytics
		const analyticsService = new AnalyticsService();
		const currentTrack = player.queue.current?.info;
		await analyticsService.logActivity(ctx.guild.id, ctx.author.id, "resume_command", {
			track: currentTrack?.title,
			artist: currentTrack?.author,
			timestamp: new Date().toISOString()
		}).catch((err) => {
			this.client.logger.error("Failed to log resume command:", err);
		});
		
		return await ctx.sendMessage({
			embeds: [
				embed
					.setColor(this.client.color.main)
					.setDescription(ctx.locale("cmd.resume.messages.resumed")),
			],
		});
	}
}


import { Command, type Context, type Lavamusic } from "../../structures/index";
import { analyticsService } from "../../database/analytics";

export default class Stats extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "stats",
			description: {
				content: "View your music listening statistics",
				examples: ["stats", "stats @user"],
				usage: "stats [@user]",
			},
			category: "info",
			aliases: ["statistics", "mystats"],
			cooldown: 5,
			args: false,
			player: {
				voice: false,
				dj: false,
				active: false,
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
			options: [
				{
					name: "user",
					description: "User to get stats for",
					type: 9,
					required: false,
				},
			],
		});
	}

	public async run(_client: Lavamusic, ctx: Context, _args: string[]): Promise<any> {
		const targetUser = ctx.author?.id;
		const embed = this.client.embed();

		try {
			const stats = await analyticsService.getUserStats(targetUser!);

			if (!stats) {
				return await ctx.sendMessage({
					embeds: [
						embed
							.setColor(this.client.color.red)
							.setDescription("No statistics found for this user"),
					],
				});
			}

			const hours = Math.floor(stats.totalTimeListened / 3600000);
			const minutes = Math.floor((stats.totalTimeListened % 3600000) / 60000);

			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(this.client.color.main)
						.setTitle("📊 Music Statistics")
						.setImage(ctx.author?.displayAvatarURL({ size: 256 }) || null)
						.addFields([
							{
								name: "Total Tracks Played",
								value: `\`${stats.totalTracksPlayed}\``,
								inline: true,
							},
							{
								name: "Total Listening Time",
								value: `\`${hours}h ${minutes}m\``,
								inline: true,
							},
							{
								name: "Listening Streak",
								value: `\`${stats.listeningStreak || 0} days\``,
								inline: true,
							},
							{
								name: "Top Genres",
								value: stats.favoriteGenres
									?.slice(0, 3)
									.map((g: any) => `${g.genre} (${g.count})`)
									.join("\n") || "None yet",
								inline: false,
							},
							{
								name: "Top Artists",
								value: stats.favoriteArtists
									?.slice(0, 3)
									.map((a: any) => `${a.artist} (${a.count})`)
									.join("\n") || "None yet",
								inline: false,
							},
						])
						.setFooter({ text: "Keep enjoying music! 🎵" }),
				],
			});
		} catch (error) {
			console.error("Error in stats command:", error);
			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(this.client.color.red)
						.setDescription("Failed to retrieve statistics"),
				],
			});
		}
	}
}

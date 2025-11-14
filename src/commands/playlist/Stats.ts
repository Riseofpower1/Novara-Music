import { Command, type Context, type Lavamusic } from "../../structures/index";
import {
	createCommandPermissions,
} from "../../utils/commandHelpers";
import { getPlaylistStats } from "../../utils/playlistHelpers";

export default class PlaylistStats extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "playliststats",
			description: {
				content: "View statistics for a playlist",
				examples: ["playliststats myplaylist"],
				usage: "playliststats <name>",
			},
			category: "playlist",
			aliases: ["plstats", "pstats"],
			cooldown: 3,
			args: true,
			player: {
				voice: false,
				dj: false,
				active: false,
				djPerm: null,
			},
			permissions: createCommandPermissions(),
			slashCommand: true,
			options: [
				{
					name: "name",
					description: "Playlist name",
					type: 3,
					required: true,
					autocomplete: true,
				},
			],
		});
	}

	public async run(
		client: Lavamusic,
		ctx: Context,
		args: string[],
	): Promise<any> {
		const playlistName = args.join(" ").trim().toLowerCase();
		const embed = this.client.embed();

		const stats = await getPlaylistStats(
			client,
			ctx.author?.id!,
			playlistName,
		);

		if (!stats) {
			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(this.client.color.red)
						.setDescription("Playlist not found."),
				],
			});
		}

		const description = [
			`**Total Tracks:** ${stats.totalTracks}`,
			`**Total Duration:** ${client.utils.formatTime(stats.totalDuration)}`,
			`**Average Duration:** ${client.utils.formatTime(stats.averageDuration)}`,
			`**Times Played:** ${stats.playCount}`,
			stats.lastPlayedAt
				? `**Last Played:** <t:${Math.floor(stats.lastPlayedAt.getTime() / 1000)}:R>`
				: "**Last Played:** Never",
			stats.createdAt
				? `**Created:** <t:${Math.floor(stats.createdAt.getTime() / 1000)}:D>`
				: "",
			`**Collaborators:** ${stats.collaborators}`,
			`**Shared With:** ${stats.sharedWith}`,
		]
			.filter(Boolean)
			.join("\n");

		return await ctx.sendMessage({
			embeds: [
				embed
					.setColor(this.client.color.main)
					.setAuthor({
						name: `Statistics for "${playlistName}"`,
						iconURL: ctx.author?.displayAvatarURL(),
					})
					.setDescription(description),
			],
		});
	}
}


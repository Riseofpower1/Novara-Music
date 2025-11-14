import { Command, type Context, type Lavamusic } from "../../structures/index";
import {
	ACTIVE_PLAYER_CONFIG,
	createMusicCommandPermissions,
} from "../../utils/commandHelpers";
import { getQueueHistory } from "../../utils/queueHelpers";

export default class QueueHistory extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "queuehistory",
			description: {
				content: "View recently played tracks from queue history",
				examples: ["queuehistory"],
				usage: "queuehistory",
			},
			category: "music",
			aliases: ["qh", "history"],
			cooldown: 3,
			args: false,
			player: ACTIVE_PLAYER_CONFIG,
			permissions: createMusicCommandPermissions(),
			slashCommand: true,
			options: [],
		});
	}

	public async run(client: Lavamusic, ctx: Context): Promise<any> {
		const player = client.manager.getPlayer(ctx.guild.id);
		if (!player) {
			return await ctx.sendMessage(
				ctx.locale("event.message.no_music_playing"),
			);
		}

		const history = getQueueHistory(player);
		const embed = this.client.embed();

		if (history.length === 0) {
			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(this.client.color.red)
						.setDescription("No queue history available."),
				],
			});
		}

		const historyStrings: string[] = [];
		for (let i = 0; i < history.length; i++) {
			const entry = history[i];
			historyStrings.push(
				`**${i + 1}.** [${entry.track.info.title}](${entry.track.info.uri}) - ${entry.track.info.author}\n` +
					`   Duration: ${entry.track.info.isStream ? "LIVE" : client.utils.formatTime(entry.track.info.duration || 0)}`,
			);
		}

		const chunks = client.utils.chunk(historyStrings, 10);
		const pages = chunks.map((chunk, index) => {
			return this.client
				.embed()
				.setColor(this.client.color.main)
				.setAuthor({
					name: "Queue History",
					iconURL: ctx.guild.icon
						? ctx.guild.iconURL()!
						: ctx.author?.displayAvatarURL(),
				})
				.setDescription(chunk.join("\n\n"))
				.setFooter({
					text: `Page ${index + 1} of ${chunks.length} • ${history.length} tracks`,
				});
		});

		return await client.utils.paginate(client, ctx, pages);
	}
}


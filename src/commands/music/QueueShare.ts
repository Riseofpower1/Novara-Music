import { Command, type Context, type Lavamusic } from "../../structures/index";
import {
	ACTIVE_PLAYER_CONFIG,
	createMusicCommandPermissions,
} from "../../utils/commandHelpers";
import { exportQueue } from "../../utils/queueHelpers";

export default class QueueShare extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "queueshare",
			description: {
				content: "Export and share the current queue",
				examples: ["queueshare"],
				usage: "queueshare",
			},
			category: "music",
			aliases: ["qshare", "exportqueue"],
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
		const embed = this.client.embed();

		if (!player) {
			return await ctx.sendMessage(
				ctx.locale("event.message.no_music_playing"),
			);
		}

		const exported = exportQueue(player);
		const queueText: string[] = [];

		if (exported.current) {
			queueText.push("**Now Playing:**");
			queueText.push(
				`[${exported.current.info.title}](${exported.current.info.uri}) - ${exported.current.info.author}`,
			);
			queueText.push("");
		}

		if (exported.queue.length > 0) {
			queueText.push("**Queue:**");
			exported.queue.forEach((track, index) => {
				queueText.push(
					`${index + 1}. [${track.title}](${track.uri}) - ${track.author}`,
				);
			});
		} else {
			queueText.push("**Queue:** (empty)");
		}

		if (exported.history.length > 0) {
			queueText.push("");
			queueText.push("**Recently Played:**");
			exported.history.slice(-10).forEach((track, index) => {
				queueText.push(
					`${index + 1}. [${track.title}](${track.uri}) - ${track.author}`,
				);
			});
		}

		// Create shareable text format
		const shareText = queueText.join("\n");

		return await ctx.sendMessage({
			embeds: [
				embed
					.setColor(this.client.color.main)
					.setAuthor({
						name: `Queue from ${ctx.guild.name}`,
						iconURL: ctx.guild.iconURL() || undefined,
					})
					.setDescription(
						shareText.length > 4096
							? shareText.substring(0, 4093) + "..."
							: shareText,
					)
					.setFooter({
						text: `Total: ${exported.queue.length} tracks in queue`,
					}),
			],
		});
	}
}


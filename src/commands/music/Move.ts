import { Command, type Context, type Lavamusic } from "../../structures/index";
import {
	ACTIVE_DJ_PLAYER_CONFIG,
	createMusicCommandPermissions,
} from "../../utils/commandHelpers";
import { moveTrack } from "../../utils/queueHelpers";

export default class Move extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "move",
			description: {
				content: "Move a track to a different position in the queue",
				examples: ["move 5 1", "move 3 10"],
				usage: "move <from> <to>",
			},
			category: "music",
			aliases: ["mv"],
			cooldown: 3,
			args: true,
			player: ACTIVE_DJ_PLAYER_CONFIG,
			permissions: createMusicCommandPermissions(),
			slashCommand: true,
			options: [
				{
					name: "from",
					description: "Current position of the track (1-based)",
					type: 4,
					required: true,
				},
				{
					name: "to",
					description: "New position for the track (1-based)",
					type: 4,
					required: true,
				},
			],
		});
	}

	public async run(
		client: Lavamusic,
		ctx: Context,
		args: string[],
	): Promise<any> {
		const player = client.manager.getPlayer(ctx.guild.id);
		const embed = this.client.embed();

		if (!player) {
			return await ctx.sendMessage(
				ctx.locale("event.message.no_music_playing"),
			);
		}

		if (player.queue.tracks.length === 0) {
			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(this.client.color.red)
						.setDescription("The queue is empty."),
				],
			});
		}

		const from = Number(args[0]);
		const to = Number(args[1]);

		if (
			Number.isNaN(from) ||
			Number.isNaN(to) ||
			from < 1 ||
			from > player.queue.tracks.length ||
			to < 1 ||
			to > player.queue.tracks.length
		) {
			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(this.client.color.red)
						.setDescription(
							`Invalid positions. Queue has ${player.queue.tracks.length} tracks.`,
						),
				],
			});
		}

		const success = await moveTrack(player, from - 1, to - 1);

		if (!success) {
			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(this.client.color.red)
						.setDescription("Failed to move track."),
				],
			});
		}

		const track = player.queue.tracks[to - 1];
		return await ctx.sendMessage({
			embeds: [
				embed
					.setColor(this.client.color.main)
					.setDescription(
						`Moved **${track.info.title}** from position ${from} to position ${to}.`,
					),
			],
		});
	}
}


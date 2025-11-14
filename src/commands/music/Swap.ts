import { Command, type Context, type Lavamusic } from "../../structures/index";
import {
	ACTIVE_DJ_PLAYER_CONFIG,
	createMusicCommandPermissions,
} from "../../utils/commandHelpers";
import { swapTracks } from "../../utils/queueHelpers";

export default class Swap extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "swap",
			description: {
				content: "Swap two tracks in the queue",
				examples: ["swap 1 5", "swap 3 7"],
				usage: "swap <position1> <position2>",
			},
			category: "music",
			aliases: ["sw"],
			cooldown: 3,
			args: true,
			player: ACTIVE_DJ_PLAYER_CONFIG,
			permissions: createMusicCommandPermissions(),
			slashCommand: true,
			options: [
				{
					name: "position1",
					description: "First track position (1-based)",
					type: 4,
					required: true,
				},
				{
					name: "position2",
					description: "Second track position (1-based)",
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

		if (player.queue.tracks.length < 2) {
			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(this.client.color.red)
						.setDescription("Need at least 2 tracks to swap."),
				],
			});
		}

		const pos1 = Number(args[0]);
		const pos2 = Number(args[1]);

		if (
			Number.isNaN(pos1) ||
			Number.isNaN(pos2) ||
			pos1 < 1 ||
			pos1 > player.queue.tracks.length ||
			pos2 < 1 ||
			pos2 > player.queue.tracks.length ||
			pos1 === pos2
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

		const success = await swapTracks(player, pos1 - 1, pos2 - 1);

		if (!success) {
			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(this.client.color.red)
						.setDescription("Failed to swap tracks."),
				],
			});
		}

		const track1 = player.queue.tracks[pos1 - 1];
		const track2 = player.queue.tracks[pos2 - 1];
		return await ctx.sendMessage({
			embeds: [
				embed
					.setColor(this.client.color.main)
					.setDescription(
						`Swapped **${track1.info.title}** (position ${pos1}) with **${track2.info.title}** (position ${pos2}).`,
					),
			],
		});
	}
}


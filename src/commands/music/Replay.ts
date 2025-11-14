import { Command, type Context, type Lavamusic } from "../../structures/index";
import {
	ACTIVE_PLAYER_CONFIG,
	createMusicCommandPermissions,
} from "../../utils/commandHelpers";

export default class Replay extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "replay",
			description: {
				content: "cmd.replay.description",
				examples: ["replay"],
				usage: "replay",
			},
			category: "music",
			aliases: ["rp"],
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
		if (!player)
			return await ctx.sendMessage(
				ctx.locale("event.message.no_music_playing"),
			);
		if (!player.queue.current?.info.isSeekable) {
			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(this.client.color.red)
						.setDescription(ctx.locale("cmd.replay.errors.not_seekable")),
				],
			});
		}

		player.seek(0);
		return await ctx.sendMessage({
			embeds: [
				embed
					.setColor(this.client.color.main)
					.setDescription(ctx.locale("cmd.replay.messages.replaying")),
			],
		});
	}
}


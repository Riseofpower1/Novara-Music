import {
	Command,
	type Context,
	type Lavamusic,
} from "../../structures/index.js";
import {
	ACTIVE_DJ_PLAYER_CONFIG,
	createMusicCommandPermissions,
} from "../../utils/commandHelpers";

export default class Rotation extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "rotation",
			description: {
				content: "cmd.rotation.description",
				examples: ["rotation"],
				usage: "rotation",
			},
			category: "filters",
			aliases: ["rt"],
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
		if (!player)
			return await ctx.sendMessage(
				ctx.locale("event.message.no_music_playing"),
			);
		if (player.filterManager.filters.rotation) {
			player.filterManager.toggleRotation();
			await ctx.sendMessage({
				embeds: [
					{
						description: ctx.locale("cmd.rotation.messages.disabled"),
						color: this.client.color.main,
					},
				],
			});
		} else {
			player.filterManager.toggleRotation();
			await ctx.sendMessage({
				embeds: [
					{
						description: ctx.locale("cmd.rotation.messages.enabled"),
						color: this.client.color.main,
					},
				],
			});
		}
	}
}


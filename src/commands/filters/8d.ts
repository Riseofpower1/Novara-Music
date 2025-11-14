import {
	Command,
	type Context,
	type Lavamusic,
} from "../../structures/index.js";
import {
	ACTIVE_DJ_PLAYER_CONFIG,
	createMusicCommandPermissions,
} from "../../utils/commandHelpers";

export default class _8d extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "8d",
			description: {
				content: "cmd.8d.description",
				examples: ["8d"],
				usage: "8d",
			},
			category: "filters",
			aliases: ["3d"],
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
		const filterEnabled = player.filterManager.filters.rotation;

		if (filterEnabled) {
			await player.filterManager.toggleRotation();
			await ctx.sendMessage({
				embeds: [
					{
						description: ctx.locale("cmd.8d.messages.filter_disabled"),
						color: this.client.color.main,
					},
				],
			});
		} else {
			await player.filterManager.toggleRotation(0.2);
			await ctx.sendMessage({
				embeds: [
					{
						description: ctx.locale("cmd.8d.messages.filter_enabled"),
						color: this.client.color.main,
					},
				],
			});
		}
	}
}


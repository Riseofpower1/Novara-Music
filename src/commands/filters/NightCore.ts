import {
	Command,
	type Context,
	type Lavamusic,
} from "../../structures/index.js";
import {
	ACTIVE_DJ_PLAYER_CONFIG,
	createMusicCommandPermissions,
} from "../../utils/commandHelpers";

export default class NightCore extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "nightcore",
			description: {
				content: "cmd.nightcore.description",
				examples: ["nightcore"],
				usage: "nightcore",
			},
			category: "filters",
			aliases: ["nc"],
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
		const filterEnabled = player.filterManager.filters.nightcore;

		if (filterEnabled) {
			await player.filterManager.toggleNightcore();
			await ctx.sendMessage({
				embeds: [
					{
						description: ctx.locale("cmd.nightcore.messages.filter_disabled"),
						color: this.client.color.main,
					},
				],
			});
		} else {
			await player.filterManager.toggleNightcore();
			await ctx.sendMessage({
				embeds: [
					{
						description: ctx.locale("cmd.nightcore.messages.filter_enabled"),
						color: this.client.color.main,
					},
				],
			});
		}
	}
}


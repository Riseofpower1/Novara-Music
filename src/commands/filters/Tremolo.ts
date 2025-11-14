import {
	Command,
	type Context,
	type Lavamusic,
} from "../../structures/index.js";
import {
	ACTIVE_DJ_PLAYER_CONFIG,
	createMusicCommandPermissions,
} from "../../utils/commandHelpers";

export default class Tremolo extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "tremolo",
			description: {
				content: "cmd.tremolo.description",
				examples: ["tremolo"],
				usage: "tremolo",
			},
			category: "filters",
			aliases: ["tr"],
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
		const tremoloEnabled = player.filterManager.filters.tremolo;

		if (tremoloEnabled) {
			player.filterManager.toggleTremolo();
			await ctx.sendMessage({
				embeds: [
					{
						description: ctx.locale("cmd.tremolo.messages.disabled"),
						color: this.client.color.main,
					},
				],
			});
		} else {
			player.filterManager.toggleTremolo();
			await ctx.sendMessage({
				embeds: [
					{
						description: ctx.locale("cmd.tremolo.messages.enabled"),
						color: this.client.color.main,
					},
				],
			});
		}
	}
}


import {
	Command,
	type Context,
	type Lavamusic,
} from "../../structures/index.js";
import {
	ACTIVE_DJ_PLAYER_CONFIG,
	createMusicCommandPermissions,
} from "../../utils/commandHelpers";

export default class Pitch extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "pitch",
			description: {
				content: "cmd.pitch.description",
				examples: ["pitch 1", "pitch 1.5", "pitch 1,5"],
				usage: "pitch <number>",
			},
			category: "filters",
			aliases: ["ph"],
			cooldown: 3,
			args: true,
			player: ACTIVE_DJ_PLAYER_CONFIG,
			permissions: createMusicCommandPermissions(),
			slashCommand: true,
			options: [
				{
					name: "pitch",
					description: "cmd.pitch.options.pitch",
					// 10 = ApplicationCommandOptionType.Number
					type: 10,
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
		if (!player)
			return await ctx.sendMessage(
				ctx.locale("event.message.no_music_playing"),
			);
		const pitchString = args[0].replace(",", ".");
		const isValidNumber = /^[0-9]*\.?[0-9]+$/.test(pitchString);
		const pitch = Number.parseFloat(pitchString);

		if (!isValidNumber || Number.isNaN(pitch) || pitch < 0.5 || pitch > 5) {
			await ctx.sendMessage({
				embeds: [
					{
						description: ctx.locale("cmd.pitch.errors.invalid_number"),
						color: this.client.color.red,
					},
				],
			});
			return;
		}

		await player.filterManager.setPitch(pitch);
		return await ctx.sendMessage({
			embeds: [
				{
					description: ctx.locale("cmd.pitch.messages.pitch_set", {
						pitch,
					}),
					color: this.client.color.main,
				},
			],
		});
	}
}


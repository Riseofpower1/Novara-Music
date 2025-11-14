import {
	Command,
	type Context,
	type Lavamusic,
} from "../../structures/index.js";
import {
	ACTIVE_DJ_PLAYER_CONFIG,
	createMusicCommandPermissions,
} from "../../utils/commandHelpers";

export default class Rate extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "rate",
			description: {
				content: "cmd.rate.description",
				examples: ["rate 1", "rate 1.5", "rate 1,5"],
				usage: "rate <number>",
			},
			category: "filters",
			aliases: ["rt"],
			cooldown: 3,
			args: true,
			player: ACTIVE_DJ_PLAYER_CONFIG,
			permissions: createMusicCommandPermissions(),
			slashCommand: true,
			options: [
				{
					name: "rate",
					description: "cmd.rate.options.rate",
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
		const rateString = String(args[0]).replace(",", ".");
		const isValidNumber = /^[0-9]*\.?[0-9]+$/.test(rateString);
		const rate = Number.parseFloat(rateString);

		if (!isValidNumber || Number.isNaN(rate) || rate < 0.5 || rate > 5) {
			await ctx.sendMessage({
				embeds: [
					{
						description: ctx.locale("cmd.rate.errors.invalid_number"),
						color: this.client.color.red,
					},
				],
			});
			return;
		}

		await player.filterManager.setRate(rate);
		await ctx.sendMessage({
			embeds: [
				{
					description: ctx.locale("cmd.rate.messages.rate_set", {
						rate,
					}),
					color: this.client.color.main,
				},
			],
		});
	}
}


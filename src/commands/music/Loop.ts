import { Command, type Context, type Lavamusic } from "../../structures/index";
import { AnalyticsService } from "../../database/analytics";

export default class Loop extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "loop",
			description: {
				content: "cmd.loop.description",
				examples: ["loop off", "loop queue", "loop song"],
				usage: "loop",
			},
			category: "general",
			aliases: ["loop"],
			cooldown: 3,
			args: false,
			player: {
				voice: true,
				dj: false,
				active: true,
				djPerm: null,
			},
			permissions: {
				dev: false,
				client: [
					"SendMessages",
					"ReadMessageHistory",
					"ViewChannel",
					"EmbedLinks",
				],
				user: [],
			},
			slashCommand: true,
			options: [
				{
					name: "mode",
					description: "The loop mode you want to set",
					type: 3,
					required: false,
					choices: [
						{
							name: "Off",
							value: "off",
						},
						{
							name: "Song",
							value: "song",
						},
						{
							name: "Queue",
							value: "queue",
						},
					],
				},
			],
		});
	}

	public async run(client: Lavamusic, ctx: Context): Promise<any> {
		const embed = this.client.embed().setColor(this.client.color.main);
		const player = client.manager.getPlayer(ctx.guild.id);
		let loopMessage = "";

		const args = ctx.args ? ctx.args[0]?.toLowerCase() : "";
		let mode: string | undefined = undefined;
		try {
			mode = ctx.options?.get("mode")?.value as string | undefined;
		} catch {
			mode = undefined;
		}

		const argument = mode || args;

		if (!player) {
			return await ctx.sendMessage({
				embeds: [embed.setDescription(ctx.locale("player.errors.no_player"))],
			});
		}

		let newLoopMode = player.repeatMode;
		if (argument) {
			if (argument === "song" || argument === "track" || argument === "s") {
				player?.setRepeatMode("track");
				loopMessage = ctx.locale("cmd.loop.looping_song");
				newLoopMode = "track";
			} else if (argument === "queue" || argument === "q") {
				player?.setRepeatMode("queue");
				loopMessage = ctx.locale("cmd.loop.looping_queue");
				newLoopMode = "queue";
			} else if (argument === "off" || argument === "o") {
				player?.setRepeatMode("off");
				loopMessage = ctx.locale("cmd.loop.looping_off");
				newLoopMode = "off";
			} else {
				loopMessage = ctx.locale("cmd.loop.invalid_mode");
			}
		} else {
			switch (player?.repeatMode) {
				case "off": {
					player.setRepeatMode("track");
					loopMessage = ctx.locale("cmd.loop.looping_song");
					newLoopMode = "track";
					break;
				}
				case "track": {
					player.setRepeatMode("queue");
					loopMessage = ctx.locale("cmd.loop.looping_queue");
					newLoopMode = "queue";
					break;
				}
				case "queue": {
					player.setRepeatMode("off");
					loopMessage = ctx.locale("cmd.loop.looping_off");
					newLoopMode = "off";
					break;
				}
			}
		}

		// Log loop mode change for analytics
		const analyticsService = new AnalyticsService();
		await analyticsService.logActivity(ctx.guild.id, ctx.author.id, "loop_mode_changed", {
			mode: newLoopMode,
			timestamp: new Date().toISOString()
		}).catch((err) => {
			this.client.logger.error("Failed to log loop command:", err);
		});

		return await ctx.sendMessage({
			embeds: [embed.setDescription(loopMessage)],
		});
	}
}


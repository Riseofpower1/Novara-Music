import { Command, type Context, type Lavamusic } from "../../structures/index";
import {
	createCommandPermissions,
} from "../../utils/commandHelpers";
import { importPlaylist } from "../../utils/playlistHelpers";

export default class ImportPlaylist extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "playlistimport",
			description: {
				content: "Import playlist from JSON format",
				examples: ["playlistimport <json>"],
				usage: "playlistimport <json>",
			},
			category: "playlist",
			aliases: ["plimport", "pimport"],
			cooldown: 3,
			args: true,
			player: {
				voice: false,
				dj: false,
				active: false,
				djPerm: null,
			},
			permissions: createCommandPermissions(),
			slashCommand: true,
			options: [
				{
					name: "json",
					description: "JSON data of the playlist to import",
					type: 3,
					required: true,
				},
				{
					name: "overwrite",
					description: "Overwrite existing playlist if it exists",
					type: 5,
					required: false,
				},
			],
		});
	}

	public async run(
		client: Lavamusic,
		ctx: Context,
		args: string[],
	): Promise<any> {
		const embed = this.client.embed();
		let jsonData: string;
		let overwrite = false;

		// Handle slash command vs text command
		if (ctx.isInteraction && ctx.interaction?.isChatInputCommand()) {
			jsonData = ctx.interaction.options.getString("json", true);
			overwrite = ctx.interaction.options.getBoolean("overwrite") || false;
		} else {
			// For text commands, try to parse JSON from args
			jsonData = args.join(" ").trim();
		}

		try {
			const importData = JSON.parse(jsonData);
			const result = await importPlaylist(
				client,
				ctx.author?.id!,
				importData,
				overwrite,
			);

			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(result.success ? this.client.color.green : this.client.color.red)
						.setDescription(result.message),
				],
			});
		} catch (error) {
			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(this.client.color.red)
						.setDescription(
							`Invalid JSON format: ${error instanceof Error ? error.message : String(error)}`,
						),
				],
			});
		}
	}
}


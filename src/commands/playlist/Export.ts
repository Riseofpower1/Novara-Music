import { Command, type Context, type Lavamusic } from "../../structures/index";
import {
	createCommandPermissions,
} from "../../utils/commandHelpers";
import { exportPlaylist } from "../../utils/playlistHelpers";

export default class ExportPlaylist extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "playlistexport",
			description: {
				content: "Export playlist to JSON format",
				examples: ["playlistexport myplaylist"],
				usage: "playlistexport <name>",
			},
			category: "playlist",
			aliases: ["plexport", "pexport"],
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
					name: "name",
					description: "Playlist name",
					type: 3,
					required: true,
					autocomplete: true,
				},
			],
		});
	}

	public async run(
		client: Lavamusic,
		ctx: Context,
		args: string[],
	): Promise<any> {
		const playlistName = args.join(" ").trim().toLowerCase();
		const embed = this.client.embed();

		const exported = await exportPlaylist(client, ctx.author?.id!, playlistName);

		if (!exported) {
			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(this.client.color.red)
						.setDescription("Playlist not found."),
				],
			});
		}

		const json = JSON.stringify(exported, null, 2);

		// Discord has a 2000 character limit for embeds, so we'll send as a code block
		if (json.length > 1900) {
			// Send as file attachment would be better, but for now just show summary
			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(this.client.color.main)
						.setDescription(
							`**Playlist exported:** ${exported.name}\n` +
								`**Tracks:** ${exported.tracks.length}\n` +
								`**JSON too large to display** (${json.length} characters)\n\n` +
								`Use \`/playlistimport\` with the JSON data to import this playlist.`,
						),
				],
			});
		}

		return await ctx.sendMessage({
			embeds: [
				embed
					.setColor(this.client.color.main)
					.setAuthor({
						name: `Exported: ${exported.name}`,
						iconURL: ctx.author?.displayAvatarURL(),
					})
					.setDescription(`\`\`\`json\n${json}\n\`\`\``)
					.setFooter({
						text: `Use /playlistimport to import this playlist`,
					}),
			],
		});
	}
}


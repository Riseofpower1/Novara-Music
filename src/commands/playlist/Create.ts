import { Command, type Context, type Lavamusic } from "../../structures/index";
import {
	NO_PLAYER_CONFIG,
	createCommandPermissions,
} from "../../utils/commandHelpers";
import { handleError } from "../../utils/errors";

export default class CreatePlaylist extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "create",
			description: {
				content: "cmd.create.description",
				examples: ["create <name>"],
				usage: "create <name>",
			},
			category: "playlist",
			aliases: ["cre"],
			cooldown: 3,
			args: true,
			player: NO_PLAYER_CONFIG,
			permissions: createCommandPermissions(),
			slashCommand: true,
			options: [
				{
					name: "name",
					description: "cmd.create.options.name",
					type: 3,
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
		const name = args.join(" ").trim();
		const embed = this.client.embed();
		const normalizedName = name.toLowerCase();

		if (!name.length) {
			return await ctx.sendMessage({
				embeds: [
					embed
						.setDescription(ctx.locale("cmd.create.messages.name_empty"))
						.setColor(this.client.color.red),
				],
			});
		}

		if (name.length > 50) {
			return await ctx.sendMessage({
				embeds: [
					embed
						.setDescription(ctx.locale("cmd.create.messages.name_too_long"))
						.setColor(this.client.color.red),
				],
			});
		}

		const playlistExists = await client.db.getPlaylist(
			ctx.author?.id!,
			normalizedName,
		);
		if (playlistExists) {
			return await ctx.sendMessage({
				embeds: [
					embed
						.setDescription(ctx.locale("cmd.create.messages.playlist_exists"))
						.setColor(this.client.color.red),
				],
			});
		}

		try {
			await client.db.createPlaylist(ctx.author?.id!, normalizedName);
		} catch (error) {
			handleError(error, {
				client: this.client,
				commandName: "create",
				userId: ctx.author?.id,
				guildId: ctx.guild?.id,
				channelId: ctx.channel?.id,
				additionalContext: { operation: "create_playlist", playlistName: normalizedName },
			});
			return await ctx.sendMessage({
				embeds: [
					embed
						.setDescription(ctx.locale("cmd.create.messages.error"))
						.setColor(this.client.color.red),
				],
			});
		}
		return await ctx.sendMessage({
			embeds: [
				embed
					.setDescription(
						ctx.locale("cmd.create.messages.playlist_created", {
							name,
						}),
					)
					.setColor(this.client.color.green),
			],
		});
	}
}


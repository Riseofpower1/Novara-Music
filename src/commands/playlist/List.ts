import { Command, type Context, type Lavamusic } from "../../structures/index";
import {
	NO_PLAYER_CONFIG,
	createCommandPermissions,
} from "../../utils/commandHelpers";

export default class GetPlaylists extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "list",
			description: {
				content: "cmd.list.description",
				examples: ["list", "list @user"],
				usage: "list [@user]",
			},
			category: "playlist",
			aliases: ["lst"],
			cooldown: 3,
			args: false,
			player: NO_PLAYER_CONFIG,
			permissions: createCommandPermissions(),
			slashCommand: true,
			options: [
				{
					name: "user",
					description: "cmd.list.options.user",
					type: 6,
					required: false,
				},
			],
		});
	}

	public async run(client: Lavamusic, ctx: Context): Promise<any> {
		try {
			let userId: string | undefined;
			let targetUser: unknown = ctx.args[0];

			if (typeof targetUser === "string" && targetUser.startsWith("<@") && targetUser.endsWith(">")) {
				const userIdStr = targetUser.slice(2, -1).replace(/^!/, "");
				const fetchedUser = await client.users.fetch(userIdStr);
				targetUser = fetchedUser;
				userId = fetchedUser.id;
			} else if (typeof targetUser === "string" && targetUser) {
				const targetUserStr = targetUser;
				try {
					const fetchedUser = await client.users.fetch(targetUserStr);
					targetUser = fetchedUser;
					userId = fetchedUser.id;
				} catch (_error) {
					const users = client.users.cache.filter(
						(user) => user.username.toLowerCase() === targetUserStr.toLowerCase(),
					);

					if (users.size > 0) {
						const foundUser = users.first();
						targetUser = foundUser;
						userId = foundUser?.id;
					} else {
						return await ctx.sendMessage({
							embeds: [
								{
									description: ctx.locale("cmd.list.messages.invalid_username"),
									color: this.client.color.red,
								},
							],
						});
					}
				}
			} else {
				userId = ctx.author?.id;
				targetUser = ctx.author;
			}

			if (!userId) {
				return await ctx.sendMessage({
					embeds: [
						{
							description: ctx.locale("cmd.list.messages.invalid_userid"),
							color: this.client.color.red,
						},
					],
				});
			}

			const playlists = await client.db.getUserPlaylists(userId);

			if (!playlists || playlists.length === 0) {
				return await ctx.sendMessage({
					embeds: [
						{
							description: ctx.locale("cmd.list.messages.no_playlists"),
							color: this.client.color.red,
						},
					],
				});
			}

			const targetUsername = targetUser && typeof targetUser === "object" && "username" in targetUser
				? String(targetUser.username)
				: ctx.locale("cmd.list.messages.your");
			return await ctx.sendMessage({
				embeds: [
					{
						title: ctx.locale("cmd.list.messages.playlists_title", {
							username: targetUsername,
						}),
						description: playlists
							.map((playlist: any) => playlist.name)
							.join("\n"),
						color: this.client.color.main,
					},
				],
			});
		} catch (error) {
			client.logger.error(error);
			return await ctx.sendMessage({
				embeds: [
					{
						description: ctx.locale("cmd.list.messages.error"),
						color: this.client.color.red,
					},
				],
			});
		}
	}
}


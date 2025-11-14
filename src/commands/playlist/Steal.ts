import type { AutocompleteInteraction } from "discord.js";
import { Command, type Context, type Lavamusic } from "../../structures/index";
import {
	NO_PLAYER_CONFIG,
	createCommandPermissions,
} from "../../utils/commandHelpers";
import { handleError } from "../../utils/errors";

export default class StealPlaylist extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "steal",
			description: {
				content: "cmd.steal.description",
				examples: ["steal <@user> <playlist_name>"],
				usage: "steal <@user> <playlist_name>",
			},
			category: "playlist",
			aliases: ["st"],
			cooldown: 3,
			args: true,
			player: NO_PLAYER_CONFIG,
			permissions: createCommandPermissions(),
			slashCommand: true,
			options: [
				{
					name: "user",
					description: "cmd.steal.options.user",
					type: 6,
					required: true,
				},
				{
					name: "playlist",
					description: "cmd.steal.options.playlist",
					type: 3,
					required: true,
					autocomplete: true,
				},
			],
		});
	}

	public async run(client: Lavamusic, ctx: Context): Promise<any> {
		let targetUser = ctx.args[0];
		const playlistName = ctx.args[1];
		let targetUserId: string | null = null;

		if (typeof targetUser === "string" && targetUser.startsWith("<@") && targetUser.endsWith(">")) {
			const userIdStr = targetUser.slice(2, -1).replace(/^!/, "");
			const fetchedUser = await client.users.fetch(userIdStr);
			targetUser = fetchedUser;
			targetUserId = fetchedUser.id;
		} else if (typeof targetUser === "string" && targetUser) {
			try {
				const fetchedUser = await client.users.fetch(targetUser);
				targetUser = fetchedUser;
				targetUserId = fetchedUser.id;
			} catch (_error) {
				const users = client.users.cache.filter(
					(user) => typeof targetUser === "string" && user.username.toLowerCase() === targetUser.toLowerCase(),
				);

				if (users.size > 0) {
					const foundUser = users.first();
					targetUser = foundUser;
					targetUserId = foundUser?.id || null;
				} else {
					return await ctx.sendMessage({
						embeds: [
							{
								description: "Invalid username or user not found.",
								color: this.client.color.red,
							},
						],
					});
				}
			}
		}

		if (!playlistName || typeof playlistName !== "string") {
			return await ctx.sendMessage({
				embeds: [
					{
						description: ctx.locale("cmd.steal.messages.provide_playlist"),
						color: this.client.color.red,
					},
				],
			});
		}

		if (!targetUserId) {
			return await ctx.sendMessage({
				embeds: [
					{
						description: ctx.locale("cmd.steal.messages.provide_user"),
						color: this.client.color.red,
					},
				],
			});
		}

		try {
			const targetPlaylist = await client.db.getPlaylist(
				targetUserId,
				playlistName,
			);

			if (!targetPlaylist) {
				return await ctx.sendMessage({
					embeds: [
						{
							description: ctx.locale("cmd.steal.messages.playlist_not_exist"),
							color: this.client.color.red,
						},
					],
				});
			}

			const targetSongs = await client.db.getTracksFromPlaylist(
				targetUserId,
				playlistName,
			);

			if (!ctx.author?.id) {
				return await ctx.sendMessage({
					embeds: [
						{
							description: "Unable to identify user.",
							color: this.client.color.red,
						},
					],
				});
			}

			const existingPlaylist = await client.db.getPlaylist(
				ctx.author.id,
				playlistName,
			);
			if (existingPlaylist) {
				return await ctx.sendMessage({
					embeds: [
						{
							description: ctx.locale("cmd.steal.messages.playlist_exists", {
								playlist: playlistName,
							}),
							color: this.client.color.red,
						},
					],
				});
			}

			if (targetSongs) {
				await client.db.createPlaylistWithTracks(
					ctx.author.id,
					playlistName,
					targetSongs,
				);
			}

			return await ctx.sendMessage({
				embeds: [
					{
						description: ctx.locale("cmd.steal.messages.playlist_stolen", {
							playlist: playlistName,
							user: targetUser && typeof targetUser === "object" && "username" in targetUser ? String(targetUser.username) : "Unknown",
						}),
						color: this.client.color.main,
					},
				],
			});
		} catch (error) {
			client.logger.error(error);
			return await ctx.sendMessage({
				embeds: [
					{
						description: ctx.locale("cmd.steal.messages.error_occurred"),
						color: this.client.color.red,
					},
				],
			});
		}
	}

	public async autocomplete(interaction: AutocompleteInteraction) {
		try {
			const focusedValue = interaction.options.getFocused();
			const userOptionId = interaction.options.get("user")?.value as string;

			if (!userOptionId) {
				await interaction
					.respond([
						{
							name: "Please specify a user to search their playlists.",
							value: "NoUser",
						},
					])
					.catch((err) => {
						handleError(err, {
							client: this.client,
							commandName: "steal",
							userId: interaction.user.id,
							guildId: interaction.guildId || undefined,
							channelId: interaction.channelId || undefined,
							additionalContext: { operation: "autocomplete_no_user" },
						});
					});
				return;
			}

			const user = await interaction.client.users.fetch(userOptionId);
			if (!user) {
				await interaction
					.respond([{ name: "User not found.", value: "NoUserFound" }])
					.catch((err) => {
						handleError(err, {
							client: this.client,
							commandName: "steal",
							userId: interaction.user.id,
							guildId: interaction.guildId || undefined,
							channelId: interaction.channelId || undefined,
							additionalContext: { operation: "autocomplete_user_not_found", userOptionId },
						});
					});
				return;
			}

			const playlists = await this.client.db.getUserPlaylists(user.id);

			if (!playlists || playlists.length === 0) {
				await interaction
					.respond([
						{ name: "No playlists found for this user.", value: "NoPlaylists" },
					])
					.catch((err) => {
						handleError(err, {
							client: this.client,
							commandName: "steal",
							userId: interaction.user.id,
							guildId: interaction.guildId || undefined,
							channelId: interaction.channelId || undefined,
							additionalContext: { operation: "autocomplete_no_playlists", targetUserId: user.id },
						});
					});
				return;
			}

			const filtered = playlists.filter((playlist) =>
				playlist.name.toLowerCase().startsWith(focusedValue.toLowerCase()),
			);

			return await interaction
				.respond(
					filtered.map((playlist) => ({
						name: playlist.name,
						value: playlist.name,
					})),
				)
				.catch((err) => {
					handleError(err, {
						client: this.client,
						commandName: "steal",
						userId: interaction.user.id,
						guildId: interaction.guildId || undefined,
						channelId: interaction.channelId || undefined,
						additionalContext: { operation: "autocomplete_respond", targetUserId: user.id },
					});
				});
		} catch (error) {
			handleError(error, {
				client: this.client,
				commandName: "steal",
				userId: interaction.user.id,
				guildId: interaction.guildId || undefined,
				channelId: interaction.channelId || undefined,
				additionalContext: { operation: "autocomplete_error" },
			});
			return await interaction
				.respond([
					{
						name: "An error occurred while fetching playlists.",
						value: "Error",
					},
				])
				.catch((err) => {
					handleError(err, {
						client: this.client,
						commandName: "steal",
						userId: interaction.user.id,
						guildId: interaction.guildId || undefined,
						channelId: interaction.channelId || undefined,
						additionalContext: { operation: "autocomplete_error_respond" },
					});
				});
		}
	}
}


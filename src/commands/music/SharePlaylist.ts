import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { Command, type Context, type Lavamusic } from "../../structures/index";
import { SpotifyService } from "../../integrations/spotify";
import { env } from "../../env";
import {
	NO_PLAYER_CONFIG,
	createCommandPermissions,
} from "../../utils/commandHelpers";
import { handleError } from "../../utils/errors";

export default class SharePlaylist extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "shareplaylist",
			description: {
				content: "cmd.shareplaylist.description",
				examples: ["shareplaylist", "shareplaylist My Favorites"],
				usage: "shareplaylist [playlist_name]",
			},
			category: "music",
			aliases: ["spsharepl", "plshare"],
			cooldown: 3,
			args: false,
			player: NO_PLAYER_CONFIG,
			permissions: createCommandPermissions(),
			slashCommand: true,
			options: [
				{
					name: "playlist_name",
					description: "cmd.shareplaylist.options.playlist_name",
					type: 3,
					required: false,
					autocomplete: true,
				},
			],
		});
	}

	public async run(_client: Lavamusic, ctx: Context): Promise<any> {
		const spotifyService = new SpotifyService(
			(env.SPOTIFY_CLIENT_ID || "") as string,
			(env.SPOTIFY_CLIENT_SECRET || "") as string
		);

		try {
			const user = await spotifyService.getUser(ctx.author?.id || "");

			if (!user || !user.accessToken) {
				return await ctx.sendMessage({
					embeds: [
						this.client
							.embed()
							.setColor(this.client.color.red)
							.setDescription(
								"❌ You haven't linked your Spotify account yet. Use `/spotifylink` to connect your account."
							),
					],
				});
			}

			// Check if token is expired and refresh if needed
			let accessToken = user.accessToken;
			if (new Date() > new Date(user.expiresAt)) {
				const newToken = await spotifyService.refreshToken(ctx.author?.id || "");
				if (!newToken) {
					return await ctx.sendMessage({
						embeds: [
							this.client
								.embed()
								.setColor(this.client.color.red)
								.setDescription(
									"❌ Failed to refresh Spotify token. Please link your account again."
								),
						],
					});
				}
				accessToken = newToken;
			}

			// Get playlists
			const playlists = await spotifyService.getPlaylists(accessToken);

			if (!playlists || playlists.length === 0) {
				return await ctx.sendMessage({
					embeds: [
						this.client
							.embed()
							.setColor(this.client.color.main)
							.setDescription("🎵 You don't have any playlists to share."),
					],
				});
			}

			// Get playlist by name or use first one
			let playlist = playlists[0];
			try {
				const playlistNameOption = ctx.options.get("playlist_name");
				if (playlistNameOption) {
					const searchName = (playlistNameOption.value as string).toLowerCase();
					const found = playlists.find(p => p.name.toLowerCase() === searchName);
					if (found) {
						playlist = found;
					}
				}
			} catch {
				playlist = playlists[0];
			}

			// Get tracks for preview
			const tracks = await spotifyService.getPlaylistTracks(accessToken, playlist.id);
			const previewTracks = tracks.slice(0, 5);

			const trackList = previewTracks
				.map((t, i) => `${i + 1}. [${t.track.name}](${t.track.external_urls?.spotify})`)
				.join("\n");

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setLabel("Open on Spotify")
					.setStyle(ButtonStyle.Link)
					.setURL(playlist.external_urls?.spotify || "https://spotify.com")
			);

			const embed = new EmbedBuilder()
				.setColor("#1DB954")
				.setAuthor({
					name: `${ctx.author?.username || "User"} is sharing`,
					iconURL: ctx.author?.displayAvatarURL() || "",
				})
				.setTitle(playlist.name)
				.setURL(playlist.external_urls?.spotify)
				.setThumbnail(playlist.images?.[0]?.url || "")
				.setDescription(
					`**Description:** ${playlist.description || "No description"}\n\n**Preview:**\n${trackList || "No tracks"}`
				)
				.addFields(
					{
						name: "🎵 Tracks",
						value: playlist.tracks?.total?.toString() || "0",
						inline: true,
					},
					{
						name: "👤 By",
						value: playlist.owner?.display_name || "Unknown",
						inline: true,
					},
					{
						name: "👥 Followers",
						value: playlist.followers?.total?.toString() || "0",
						inline: true,
					}
				)
				.setFooter({
					text: `Shared from Novara Music`,
					iconURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/AdobeSpotifyLogo.svg/1024px-AdobeSpotifyLogo.svg.png",
				})
				.setTimestamp();

			return await ctx.sendMessage({ embeds: [embed], components: [row] });
		} catch (error) {
			handleError(error, {
				client: this.client,
				commandName: "shareplaylist",
				userId: ctx.author?.id,
				guildId: ctx.guild?.id,
				channelId: ctx.channel?.id,
				additionalContext: { operation: "share_spotify_playlist" },
			});
			return await ctx.sendMessage({
				embeds: [
					this.client
						.embed()
						.setColor(this.client.color.red)
						.setDescription("❌ Failed to share your Spotify playlist."),
				],
			});
		}
	}
}

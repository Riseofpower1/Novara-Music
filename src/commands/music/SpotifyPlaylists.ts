import { Command, type Context, type Lavamusic } from "../../structures/index";
import { SpotifyService } from "../../integrations/spotify";
import { env } from "../../env";
import {
	NO_PLAYER_CONFIG,
	createCommandPermissions,
} from "../../utils/commandHelpers";
import { handleError } from "../../utils/errors";

export default class SpotifyPlaylists extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "spotifyplaylists",
			description: {
				content: "cmd.spotifyplaylists.description",
				examples: ["spotifyplaylists"],
				usage: "spotifyplaylists",
			},
			category: "music",
			aliases: ["spplist", "spotifylists"],
			cooldown: 3,
			args: false,
			player: NO_PLAYER_CONFIG,
			permissions: createCommandPermissions(),
			slashCommand: true,
			options: [],
		});
	}

	public async run(_client: Lavamusic, ctx: Context): Promise<any> {
		const spotifyService = new SpotifyService(
			env.SPOTIFY_CLIENT_ID || "",
			env.SPOTIFY_CLIENT_SECRET || ""
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

			const playlists = await spotifyService.getPlaylists(accessToken);

			if (playlists.length === 0) {
				return await ctx.sendMessage({
					embeds: [
						this.client
							.embed()
							.setColor(this.client.color.main)
							.setDescription("📝 You don't have any playlists yet."),
					],
				});
			}

			// Show first 10 playlists
			const displayPlaylists = playlists.slice(0, 10);
			const playlistList = displayPlaylists
				.map(
					(p, i) =>
						`${i + 1}. [${p.name}](${p.external_urls?.spotify}) • ${p.tracks?.total || 0} tracks`
				)
				.join("\n");

			const embed = this.client
				.embed()
				.setColor("#1DB954")
				.setAuthor({
					name: `${user.displayName}'s Playlists`,
					iconURL:
						user.profileImage ||
						"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/AdobeSpotifyLogo.svg/1024px-AdobeSpotifyLogo.svg.png",
				})
				.setDescription(playlistList)
				.setFooter({
					text: `Showing ${displayPlaylists.length} of ${playlists.length} playlists`,
				});

			return await ctx.sendMessage({ embeds: [embed] });
		} catch (error) {
			handleError(error, {
				client: this.client,
				commandName: "spotifyplaylists",
				userId: ctx.author?.id,
				guildId: ctx.guild?.id,
				channelId: ctx.channel?.id,
				additionalContext: { operation: "fetch_spotify_playlists" },
			});
			return await ctx.sendMessage({
				embeds: [
					this.client
						.embed()
						.setColor(this.client.color.red)
						.setDescription("❌ Failed to fetch your Spotify playlists."),
				],
			});
		}
	}
}

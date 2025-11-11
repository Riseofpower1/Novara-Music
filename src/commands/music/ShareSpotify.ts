import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { Command, type Context, type Lavamusic } from "../../structures/index";
import { SpotifyService } from "../../integrations/spotify";
import { env } from "../../env";

export default class ShareSpotify extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "sharespotify",
			description: {
				content: "cmd.sharespotify.description",
				examples: ["sharespotify"],
				usage: "sharespotify",
			},
			category: "music",
			aliases: ["share", "spshare"],
			cooldown: 3,
			args: false,
			player: {
				voice: false,
				dj: false,
				active: false,
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

			const currentTrack = await spotifyService.getCurrentTrack(accessToken);

			if (!currentTrack || !currentTrack.item) {
				return await ctx.sendMessage({
					embeds: [
						this.client
							.embed()
							.setColor(this.client.color.main)
							.setDescription("🎵 You're not currently playing anything on Spotify to share."),
					],
				});
			}

			const track = currentTrack.item;
			const progressMs = currentTrack.progress_ms || 0;
			const durationMs = track.duration_ms || 0;
			const percentage = Math.round((progressMs / durationMs) * 100) || 0;

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setLabel("Open on Spotify")
					.setStyle(ButtonStyle.Link)
					.setURL(track.external_urls?.spotify || "https://spotify.com")
			);

			const embed = new EmbedBuilder()
				.setColor("#1DB954")
				.setAuthor({
					name: `${ctx.author?.username || "User"} is sharing`,
					iconURL: ctx.author?.displayAvatarURL() || "",
				})
				.setTitle(track.name)
				.setURL(track.external_urls?.spotify)
				.setThumbnail(track.album?.images?.[0]?.url || "")
				.addFields(
					{
						name: "🎤 Artist",
						value: track.artists
							?.map((a: any) => a.name)
							.join(", ") || "Unknown",
						inline: true,
					},
					{
						name: "💿 Album",
						value: track.album?.name || "Unknown",
						inline: true,
					},
					{
						name: "⏱️ Duration",
						value: `${Math.floor(durationMs / 60000)}:${String(Math.floor((durationMs % 60000) / 1000)).padStart(2, "0")}`,
						inline: true,
					},
					{
						name: "🎚️ Playing",
						value: `${percentage}% complete`,
						inline: true,
					}
				)
				.setFooter({
					text: "🎵 Shared from Novara Music",
					iconURL: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/AdobeSpotifyLogo.svg/1024px-AdobeSpotifyLogo.svg.png",
				})
				.setTimestamp();

			return await ctx.sendMessage({ embeds: [embed], components: [row] });
		} catch (error) {
			console.error("Error sharing Spotify track:", error);
			return await ctx.sendMessage({
				embeds: [
					this.client
						.embed()
						.setColor(this.client.color.red)
						.setDescription("❌ Failed to share your Spotify track."),
				],
			});
		}
	}
}

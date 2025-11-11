import { Command, type Context, type Lavamusic } from "../../structures/index";
import { SpotifyService } from "../../integrations/spotify";
import { env } from "../../env";

export default class SpotifyNow extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "spotifynow",
			description: {
				content: "cmd.spotifynow.description",
				examples: ["spotifynow"],
				usage: "spotifynow",
			},
			category: "music",
			aliases: ["spnow", "spotify"],
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
								"❌ You haven't linked your Spotify account yet. Use `/spotify link` to connect your account."
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

		if (!currentTrack) {
			return await ctx.sendMessage({
				embeds: [
					this.client
						.embed()
						.setColor(this.client.color.red)
						.setDescription(
							"❌ Failed to fetch currently playing track.\n\n" +
							"**This may be because:**\n" +
							"1. Your Spotify app registration was added after you authorized\n" +
							"2. Your authorization token is stale\n\n" +
							"**Solution:**\n" +
							"Try unlinking and re-linking your account:\n" +
							"`/unlink spotify` → Wait 5 seconds → `/spotifylink`\n\n" +
							"If the issue persists, contact the bot owner."
						),
				],
			});
		}

		if (!currentTrack.item) {
			return await ctx.sendMessage({
				embeds: [
					this.client
						.embed()
						.setColor(this.client.color.main)
						.setDescription("🎵 You're not currently playing anything on Spotify."),
				],
			});
		}			const track = currentTrack.item;
			const isPlaying = currentTrack.is_playing;
			const progressMs = currentTrack.progress_ms || 0;
			const durationMs = track.duration_ms || 0;
			const percentage = Math.round((progressMs / durationMs) * 100) || 0;

			const embed = this.client
				.embed()
				.setColor("#1DB954") // Spotify green
				.setAuthor({
					name: isPlaying ? "🎵 Now Playing on Spotify" : "⏸️ Paused on Spotify",
					iconURL:
						"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/AdobeSpotifyLogo.svg/1024px-AdobeSpotifyLogo.svg.png",
				})
				.setTitle(track.name)
				.setURL(track.external_urls?.spotify)
				.setThumbnail(track.album?.images?.[0]?.url)
				.addFields(
					{
						name: "Artist",
						value: track.artists
							?.map((a: any) => `[${a.name}](${a.external_urls?.spotify})`)
							.join(", ") || "Unknown",
						inline: true,
					},
					{
						name: "Album",
						value: `[${track.album?.name}](${track.album?.external_urls?.spotify})` || "Unknown",
						inline: true,
					},
					{
						name: "Duration",
						value: `${Math.floor(durationMs / 60000)}:${String(Math.floor((durationMs % 60000) / 1000)).padStart(2, "0")}`,
						inline: true,
					},
					{
						name: "Progress",
						value: `${Math.floor(progressMs / 60000)}:${String(Math.floor((progressMs % 60000) / 1000)).padStart(2, "0")} (${percentage}%)`,
						inline: true,
					}
				);

			return await ctx.sendMessage({ embeds: [embed] });
		} catch (error) {
			console.error("Error fetching Spotify now playing:", error);
			return await ctx.sendMessage({
				embeds: [
					this.client
						.embed()
						.setColor(this.client.color.red)
						.setDescription("❌ Failed to fetch your Spotify data."),
				],
			});
		}
	}
}

import { Command, type Context, type Lavamusic } from "../../structures/index";
import { SpotifyService } from "../../integrations/spotify";
import { env } from "../../env";

export default class FriendsSpotify extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "friendspotify",
			description: {
				content: "cmd.friendspotify.description",
				examples: ["friendspotify"],
				usage: "friendspotify",
			},
			category: "music",
			aliases: ["spfriends", "whoslisten"],
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
			(env.SPOTIFY_CLIENT_ID || "") as string,
			(env.SPOTIFY_CLIENT_SECRET || "") as string
		);

		try {
			const allSpotifyUsers = await spotifyService.getAllUsers();
			const friendsPlaying: any[] = [];

			for (const spotifyUser of allSpotifyUsers) {
				try {
					let accessToken = spotifyUser.accessToken;

					if (new Date() > new Date(spotifyUser.expiresAt)) {
						const newToken = await spotifyService.refreshToken(spotifyUser.userId);
						if (!newToken) continue;
						accessToken = newToken;
					}

					const currentTrack = await spotifyService.getCurrentTrack(accessToken);

					if (currentTrack?.item && currentTrack.is_playing) {
						friendsPlaying.push({
							userId: spotifyUser.userId,
							displayName: spotifyUser.displayName,
							profileImage: spotifyUser.profileImage,
							track: currentTrack.item.name,
							artist: currentTrack.item.artists?.[0]?.name,
							album: currentTrack.item.album?.name,
							trackUrl: currentTrack.item.external_urls?.spotify,
						});
					}
				} catch (error) {
					console.error(`Error fetching Spotify data for user ${spotifyUser.userId}:`, error);
				}
			}

			if (friendsPlaying.length === 0) {
				return await ctx.sendMessage({
					embeds: [
						this.client
							.embed()
							.setColor(this.client.color.main)
							.setDescription("🎵 No one is currently listening to Spotify or has not linked their account."),
					],
				});
			}

			// Show all friends listening
			const description = friendsPlaying
				.map(
					(f) =>
						`**${f.displayName}** 🎵\n` +
						`[${f.track}](${f.trackUrl}) by ${f.artist}\n` +
						`_Album: ${f.album}_`
				)
				.join("\n\n");

			const embed = this.client
				.embed()
				.setColor("#1DB954")
				.setTitle("🎧 What's Your Friends Listening To?")
				.setDescription(description)
				.setFooter({
					text: `${friendsPlaying.length} friend${friendsPlaying.length !== 1 ? "s" : ""} listening`,
				});

			return await ctx.sendMessage({ embeds: [embed] });
		} catch (error) {
			console.error("Error fetching friends Spotify data:", error);
			return await ctx.sendMessage({
				embeds: [
					this.client
						.embed()
						.setColor(this.client.color.red)
						.setDescription("❌ Failed to fetch friends' Spotify data."),
				],
			});
		}
	}
}

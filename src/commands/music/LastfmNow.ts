import { Command, type Context, type Lavamusic } from "../../structures/index";
import { LastfmService } from "../../integrations/lastfm";
import { env } from "../../env";
import {
	NO_PLAYER_CONFIG,
	createCommandPermissions,
} from "../../utils/commandHelpers";
import { handleError } from "../../utils/errors";

export default class LastfmNow extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "lastfmnow",
			description: {
				content: "cmd.lastfmnow.description",
				examples: ["lastfmnow"],
				usage: "lastfmnow",
			},
			category: "music",
			aliases: ["lfnow", "lastfm"],
			cooldown: 3,
			args: false,
			player: NO_PLAYER_CONFIG,
			permissions: createCommandPermissions(),
			slashCommand: true,
			options: [],
		});
	}

	public async run(_client: Lavamusic, ctx: Context): Promise<any> {
		const lastfmService = new LastfmService(
			(env.LASTFM_API_KEY || "") as string,
			(env.LASTFM_API_SECRET || "") as string
		);

		try {
			const user = await lastfmService.getUser(ctx.author?.id || "");

			if (!user || !user.lastfmUsername) {
				return await ctx.sendMessage({
					embeds: [
						this.client
							.embed()
							.setColor(this.client.color.red)
							.setDescription(
								"❌ You haven't linked your Last.fm account yet. Use `/lastfmlink` to connect your account."
							),
					],
				});
			}

			// Get recent tracks
			const recentTracks = await lastfmService.getRecentTracks(user.lastfmUsername, 1);

			if (!recentTracks || recentTracks.length === 0) {
				return await ctx.sendMessage({
					embeds: [
						this.client
							.embed()
							.setColor(this.client.color.main)
							.setDescription("🎵 You haven't scrobbled any tracks yet on Last.fm."),
					],
				});
			}

			const track = recentTracks[0];
			const isNowPlaying = track["@attr"]?.nowplaying === "true";
			const playcount = track.playcount || "0";
			const artist = track.artist.name || track.artist["#text"] || "Unknown";
			const trackName = track.name || track.title || "Unknown";
			const trackUrl = track.url || "https://last.fm";
			const imageUrl = track.image?.[3]?.["#text"] || track.image?.[2]?.["#text"] || "";

			const embed = this.client
				.embed()
				.setColor("#df212f")
				.setAuthor({
					name: `${user.lastfmUsername}'s Last.fm Scrobbles`,
					iconURL: "https://www.last.fm/static/images/lastfm_avatar_social.png",
				})
				.setTitle(`${isNowPlaying ? "🎵 Now Playing" : "Last Track"}: ${trackName}`)
				.setURL(trackUrl)
				.setDescription(`**Artist:** [${artist}](https://www.last.fm/search?q=${encodeURIComponent(artist)})\n\n**Play Count:** ${playcount}`)
				.setFooter({
					text: "Last.fm • Scrobbled Music",
					iconURL: "https://www.last.fm/static/images/lastfm_avatar_social.png",
				})
				.setTimestamp();

			if (imageUrl) {
				embed.setImage(imageUrl);
			}

			return await ctx.sendMessage({ embeds: [embed] });
		} catch (error) {
			handleError(error, {
				client: this.client,
				commandName: "lastfmnow",
				userId: ctx.author?.id,
				guildId: ctx.guild?.id,
				channelId: ctx.channel?.id,
				additionalContext: { operation: "fetch_lastfm_now_playing" },
			});
			return await ctx.sendMessage({
				embeds: [
					this.client
						.embed()
						.setColor(this.client.color.red)
						.setDescription("❌ Failed to fetch your Last.fm now playing."),
				],
			});
		}
	}
}

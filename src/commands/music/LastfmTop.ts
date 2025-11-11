import { Command, type Context, type Lavamusic } from "../../structures/index";
import { LastfmService } from "../../integrations/lastfm";
import { env } from "../../env";

export default class LastfmTop extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "lastfmtop",
			description: {
				content: "cmd.lastfmtop.description",
				examples: ["lastfmtop", "lastfmtop 7day"],
				usage: "lastfmtop [period]",
			},
			category: "music",
			aliases: ["lftop"],
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
			options: [
				{
					name: "period",
					description: "cmd.lastfmtop.options.period",
					type: 3,
					required: false,
					choices: [
						{ name: "7 days", value: "7day" },
						{ name: "30 days", value: "1month" },
						{ name: "3 months", value: "3month" },
						{ name: "6 months", value: "6month" },
						{ name: "1 year", value: "12month" },
						{ name: "All time", value: "overall" },
					],
				},
			],
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

			// Get period from options
			let period = "7day";
			try {
				const periodOption = ctx.options.get("period");
				if (periodOption) {
					period = (periodOption.value as string) || "7day";
				}
			} catch {
				period = "7day";
			}

			// Get top tracks
			const topTracks = await lastfmService.getTopTracks(user.lastfmUsername, period);

			if (!topTracks || topTracks.length === 0) {
				return await ctx.sendMessage({
					embeds: [
						this.client
							.embed()
							.setColor(this.client.color.main)
							.setDescription(`📊 No top tracks found for the selected period.`),
					],
				});
			}

			const periodLabel: Record<string, string> = {
				"7day": "Last 7 Days",
				"1month": "Last Month",
				"3month": "Last 3 Months",
				"6month": "Last 6 Months",
				"12month": "Last Year",
				"overall": "All Time",
			};

			// Build description with top 10 tracks
			const description = topTracks
				.slice(0, 10)
				.map(
					(t, i) =>
						`${i + 1}. [${t.name}](${t.url}) by **${t.artist.name || t.artist["#text"]}**\n` +
						`   Plays: ${t.playcount}`
				)
				.join("\n\n");

			const embed = this.client
				.embed()
				.setColor("#df212f")
				.setAuthor({
					name: `${user.lastfmUsername}'s Top Tracks`,
					iconURL: "https://www.last.fm/static/images/lastfm_avatar_social.png",
				})
				.setTitle(`🎵 Top Tracks - ${periodLabel[period] || period}`)
				.setDescription(description)
				.setFooter({
					text: "Last.fm • Scrobbled Music",
					iconURL: "https://www.last.fm/static/images/lastfm_avatar_social.png",
				})
				.setTimestamp();

			return await ctx.sendMessage({ embeds: [embed] });
		} catch (error) {
			console.error("Error fetching Last.fm top tracks:", error);
			return await ctx.sendMessage({
				embeds: [
					this.client
						.embed()
						.setColor(this.client.color.red)
						.setDescription("❌ Failed to fetch your Last.fm top tracks."),
				],
			});
		}
	}
}

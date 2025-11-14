import { Command, type Context, type Lavamusic } from "../../structures/index";
import { LastfmService } from "../../integrations/lastfm";
import { env } from "../../env";
import {
	NO_PLAYER_CONFIG,
	createCommandPermissions,
} from "../../utils/commandHelpers";
import { handleError } from "../../utils/errors";

export default class LastfmProfile extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "lastfmprofile",
			description: {
				content: "cmd.lastfmprofile.description",
				examples: ["lastfmprofile"],
				usage: "lastfmprofile",
			},
			category: "music",
			aliases: ["lfprofile", "lastfmstats"],
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

			// Get user info
			const userInfo = await lastfmService.getUserInfo(user.lastfmUsername);

			if (!userInfo) {
				return await ctx.sendMessage({
					embeds: [
						this.client
							.embed()
							.setColor(this.client.color.red)
							.setDescription("❌ Failed to fetch Last.fm profile information."),
					],
				});
			}

			const playcount = userInfo.playcount || "0";
			const scrobbleCount = userInfo.scrobbles || playcount;
			const realName = userInfo.realname || "Not specified";
			const country = userInfo.country || "Not specified";
			const joinDate = userInfo.registered && userInfo.registered["#text"] ? userInfo.registered["#text"] : "Unknown";
			const avatar = userInfo.image && userInfo.image[3] ? userInfo.image[3]["#text"] : "";

			const embed = this.client
				.embed()
				.setColor("#df212f")
				.setAuthor({
					name: "Last.fm Profile",
					iconURL: "https://www.last.fm/static/images/lastfm_avatar_social.png",
				})
				.setTitle(user.lastfmUsername)
				.setURL(`https://www.last.fm/user/${user.lastfmUsername}`)
				.addFields(
					{
						name: "👤 Real Name",
						value: realName,
						inline: true,
					},
					{
						name: "🌍 Country",
						value: country,
						inline: true,
					},
					{
						name: "📅 Member Since",
						value: new Date(parseInt(joinDate) * 1000).toLocaleDateString(),
						inline: true,
					},
					{
						name: "🎵 Total Scrobbles",
						value: scrobbleCount.toLocaleString ? scrobbleCount.toLocaleString() : scrobbleCount,
						inline: true,
					}
				)
				.setFooter({
					text: "Last.fm • Scrobbled Music",
					iconURL: "https://www.last.fm/static/images/lastfm_avatar_social.png",
				})
				.setTimestamp();

			if (avatar) {
				embed.setImage(avatar);
			}

			return await ctx.sendMessage({ embeds: [embed] });
		} catch (error) {
			handleError(error, {
				client: this.client,
				commandName: "lastfmprofile",
				userId: ctx.author?.id,
				guildId: ctx.guild?.id,
				channelId: ctx.channel?.id,
				additionalContext: { operation: "fetch_lastfm_profile" },
			});
			return await ctx.sendMessage({
				embeds: [
					this.client
						.embed()
						.setColor(this.client.color.red)
						.setDescription("❌ Failed to fetch your Last.fm profile."),
				],
			});
		}
	}
}

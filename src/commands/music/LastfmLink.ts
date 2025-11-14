import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { Command, type Context, type Lavamusic } from "../../structures/index";
import { lastfmOAuth } from "../../oauth/lastfm";
import {
	NO_PLAYER_CONFIG,
	createCommandPermissions,
} from "../../utils/commandHelpers";

export default class LastfmLink extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "lastfmlink",
			description: {
				content: "cmd.lastfmlink.description",
				examples: ["lastfmlink"],
				usage: "lastfmlink",
			},
			category: "music",
			aliases: ["lastfmauth", "lflink"],
			cooldown: 3,
			args: false,
			player: NO_PLAYER_CONFIG,
			permissions: createCommandPermissions(),
			slashCommand: true,
			options: [],
		});
	}

	public async run(_client: Lavamusic, ctx: Context): Promise<any> {
		// Generate a random token (Last.fm will give us a real one when user authorizes)
		const tempToken = Math.random().toString(36).substring(2, 15);
		const lastfmAuthUrl = lastfmOAuth.generateAuthUrl(tempToken);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setLabel("🔗 Authorize with Last.fm")
				.setStyle(ButtonStyle.Link)
				.setURL(lastfmAuthUrl),
			new ButtonBuilder()
				.setLabel("📋 Enter Token")
				.setStyle(ButtonStyle.Primary)
				.setCustomId("lastfm_enter_token")
		);

		return await ctx.sendMessage({
			embeds: [
				this.client
					.embed()
					.setColor("#df212f")
					.setTitle("🎵 Link Your Last.fm Account")
					.setDescription(
						"Click the button below to authorize Last.fm with Novara Music. This will allow you to:\n\n" +
						"• View your currently scrobbling track\n" +
						"• Access your listening history\n" +
						"• See your top tracks\n" +
						"• Auto-scrobble your music plays\n\n" +
						"**After linking on the Last.fm page, click the '📋 Enter Token' button to complete setup.**"
					),
			],
			components: [row],
		});
	}
}

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { Command, type Context, type Lavamusic } from "../../structures/index";
import { SpotifyOAuthService } from "../../oauth/spotify";
import {
	NO_PLAYER_CONFIG,
	createCommandPermissions,
} from "../../utils/commandHelpers";

export default class SpotifyLink extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "spotifylink",
			description: {
				content: "cmd.spotifylink.description",
				examples: ["spotifylink"],
				usage: "spotifylink",
			},
			category: "music",
			aliases: ["spotifyauth", "splink"],
			cooldown: 3,
			args: false,
			player: NO_PLAYER_CONFIG,
			permissions: createCommandPermissions(),
			slashCommand: true,
			options: [],
		});
	}

	public async run(_client: Lavamusic, ctx: Context): Promise<any> {
		const spotifyOAuth = new SpotifyOAuthService();
		const authUrl = spotifyOAuth.generateAuthUrl(ctx.author?.id || "");

		// Create button that opens Spotify authorization
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setLabel("🎵 Authorize with Spotify")
				.setStyle(ButtonStyle.Link)
				.setURL(authUrl)
		);

		// Add button to open code entry modal
		const codeModalButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId("spotify_code_entry")
				.setLabel("📋 Enter Code")
				.setStyle(ButtonStyle.Primary)
		);

		return await ctx.sendMessage({
			embeds: [
				this.client
					.embed()
					.setColor("#1DB954")
					.setTitle("🎵 Link Your Spotify Account")
					.setDescription(
						"**Step 1:** Click the \"Authorize with Spotify\" button below\n\n" +
						"**Step 2:** Log in to Spotify and authorize Novara Music\n\n" +
						"**Step 3:** You'll see a code - click \"Enter Code\" and paste it\n\n" +
						"**What we access:**\n" +
						"• View your currently playing track\n" +
						"• Access your playlists\n" +
						"• See your top tracks and artists\n" +
						"• Get personalized recommendations"
					),
			],
			components: [row, codeModalButton],
		});
	}
}


import { Command, type Context, type Lavamusic } from "../../structures/index";
import { EmbedBuilder } from "discord.js";
import { env } from "../../env";

export default class SpotifyDebug extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "spotifydebug",
			description: {
				content: "Debug Spotify connection issues (Owner only)",
				examples: ["spotifydebug"],
				usage: "spotifydebug",
			},
			category: "dev",
			aliases: ["spdebug"],
			cooldown: 5,
			args: false,
			player: {
				voice: false,
				dj: false,
				active: false,
				djPerm: null,
			},
			permissions: {
				dev: true, // Owner only
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
		const embed = new EmbedBuilder().setColor(0x1db954);

		try {
			// Check Spotify environment variables
			const clientId = env.SPOTIFY_CLIENT_ID;
			const clientSecret = env.SPOTIFY_CLIENT_SECRET;
			const redirectUri = env.SPOTIFY_REDIRECT_URI;

			const debugInfo = new EmbedBuilder()
				.setColor(0x1db954)
				.setTitle("🔍 Spotify Configuration Debug")
				.addFields(
					{
						name: "Client ID",
						value: clientId ? `✅ Set (${clientId.substring(0, 8)}...)` : "❌ NOT SET",
						inline: true,
					},
					{
						name: "Client Secret",
						value: clientSecret ? `✅ Set (${clientSecret.substring(0, 8)}...)` : "❌ NOT SET",
						inline: true,
					},
					{
						name: "Redirect URI",
						value: redirectUri || "❌ NOT SET",
						inline: false,
					},
					{
						name: "Common Issues",
						value:
							"1️⃣ **App in Development Mode?**\n" +
							"   → Check at https://developer.spotify.com/dashboard\n" +
							"   → Go to Settings tab\n\n" +
							"2️⃣ **User in Allowed List?**\n" +
							"   → Go to User Management section\n" +
							"   → Check if user's Spotify email is listed\n\n" +
							"3️⃣ **Wrong Credentials?**\n" +
							"   → Verify CLIENT_ID and CLIENT_SECRET match your app\n" +
							"   → Don't confuse with CLIENT_TOKEN\n\n" +
							"4️⃣ **Redirect URI Mismatch?**\n" +
							"   → Must exactly match: " +
							(redirectUri || "[NOT SET]"),
						inline: false,
					},
					{
						name: "Next Steps",
						value:
							"**If user getting 403 on NEW authorization:**\n\n" +
							"1. Open https://developer.spotify.com/dashboard\n" +
							"2. Click your app\n" +
							"3. Go to 'User Management' tab\n" +
							"4. Click 'Add User'\n" +
							"5. Enter the user's Spotify email\n" +
							"6. User needs to unlink/relink in bot\n\n" +
							"**If you need production access:**\n" +
							"Request 'Quota Extension' from Settings tab",
						inline: false,
					}
				)
				.setFooter({ text: "Share this info with bot owner if user reports issues" });

			return await ctx.sendMessage({ embeds: [debugInfo] });
		} catch (error) {
			this.client.logger.error("SpotifyDebug command error:", error);
			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(0xff0000)
						.setDescription("❌ Failed to retrieve debug information"),
				],
			});
		}
	}
}

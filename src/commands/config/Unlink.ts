import { Command, type Context, type Lavamusic } from "../../structures/index";
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { spotifyOAuth } from "../../oauth/spotify";
import { lastfmOAuth } from "../../oauth/lastfm";

export default class Unlink extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "unlink",
			description: {
				content: "Unlink your Spotify or Last.fm integration",
				examples: ["unlink spotify", "unlink lastfm"],
				usage: "unlink <service>",
			},
			category: "config",
			aliases: ["disconnect"],
			cooldown: 5,
			args: true,
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
					name: "service",
					description: "Service to unlink (spotify or lastfm)",
					type: 3,
					required: true,
					choices: [
						{ name: "spotify", value: "spotify" },
						{ name: "lastfm", value: "lastfm" },
					],
				},
			],
		});
	}

	public async run(_client: Lavamusic, ctx: Context, args: string[]): Promise<any> {
		const service = args[0]?.toLowerCase();
		const embed = new EmbedBuilder().setColor(this.client.color.main);
		const userId = ctx.author?.id;

		if (!userId) {
			return await ctx.sendMessage({
				embeds: [
					embed.setDescription("❌ Unable to determine your user ID"),
				],
			});
		}

		if (!service || !["spotify", "lastfm"].includes(service)) {
			return await ctx.sendMessage({
				embeds: [
					embed.setDescription(
						"Please specify a service to unlink: `spotify` or `lastfm`"
					),
				],
			});
		}

		try {
			if (service === "spotify") {
				const { SpotifyUser } = await import("../../database/models");
				const spotifyUser = await SpotifyUser.findOne({ userId });
				
				if (!spotifyUser) {
					return await ctx.sendMessage({
						embeds: [
							embed.setDescription(
								"ℹ️ You don't have a Spotify account linked"
							),
						],
					});
				}

			// Delete Spotify connection from database
			// Note: Spotify doesn't support programmatic token revocation via API
			// Users must manually revoke at https://www.spotify.com/account/apps/
			// Access tokens expire after 1 hour automatically
			await SpotifyUser.deleteOne({ userId });
			this.client.logger.info(`Spotify account unlinked for user ${userId}`);

			// Build re-auth button using OAuth service
			const spotifyAuthUrl = spotifyOAuth.generateAuthUrl(ctx.author?.id || "");

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setLabel("🎵 Link Spotify Again")
					.setStyle(ButtonStyle.Link)
					.setURL(spotifyAuthUrl)
			);

				return await ctx.sendMessage({
					embeds: [
						embed
							.setColor(0x1DB954)
							.setDescription(
								"✅ Your Spotify account has been unlinked from the bot!\n\n" +
								"**Access Token Status:**\n" +
								"✅ Your access token will expire from Spotify's side in 1 hour automatically\n\n" +
								"**Manual Revocation:**\n" +
								"ℹ️ To fully revoke this app from your Spotify connected apps, visit:\n" +
								"https://www.spotify.com/account/apps/ and click disconnect\n\n" +
								"Click the button below if you'd like to link again:"
							),
					],
					components: [row],
				});
			} else if (service === "lastfm") {
				const { LastfmUser } = await import("../../database/models");
				const result = await LastfmUser.deleteOne({ userId });
				
				if (result.deletedCount === 0) {
					return await ctx.sendMessage({
						embeds: [
							embed.setDescription(
								"ℹ️ You don't have a Last.fm account linked"
							),
						],
					});
				}

				// Generate Last.fm auth URL for re-linking
				const tempToken = Math.random().toString(36).substring(2, 15);
				const lastfmAuthUrl = lastfmOAuth.generateAuthUrl(tempToken);

				const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setLabel("🎵 Link Last.fm Again")
						.setStyle(ButtonStyle.Link)
						.setURL(lastfmAuthUrl)
				);

				return await ctx.sendMessage({
					embeds: [
						embed
							.setColor(0xDF212C)
							.setDescription(
								"✅ Your Last.fm account has been unlinked successfully!\n\n" +
								"**Access Token Status:**\n" +
								"✅ Your session key has been removed from our database\n\n" +
								"**Manual Revocation:**\n" +
								"ℹ️ To fully revoke this app from your Last.fm authorized apps, visit:\n" +
								"https://www.last.fm/settings/applications and click 'Revoke'\n\n" +
								"Click the button below if you'd like to link again:"
							),
					],
					components: [row],
				});
			}
		} catch (error) {
			this.client.logger.error(
				`Error unlinking ${service}:`,
				error instanceof Error ? error.message : String(error)
			);
			return await ctx.sendMessage({
				embeds: [
					embed
						.setColor(this.client.color.main)
						.setDescription(
							`❌ Failed to unlink ${service}. Please try again later.`
						),
				],
			});
		}
	}
}


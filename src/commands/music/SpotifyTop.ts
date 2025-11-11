import { Command, type Context, type Lavamusic } from "../../structures/index";
import { SpotifyService } from "../../integrations/spotify";
import { env } from "../../env";
import axios from "axios";

export default class SpotifyTop extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "spotifytop",
			description: {
				content: "cmd.spotifytop.description",
				examples: ["spotifytop tracks", "spotifytop artists"],
				usage: "spotifytop [tracks|artists]",
			},
			category: "music",
			aliases: ["sptop"],
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
					name: "type",
					description: "cmd.spotifytop.options.type",
					type: 3,
					required: false,
					choices: [
						{ name: "tracks", value: "tracks" },
						{ name: "artists", value: "artists" },
					],
				},
			],
		});
	}

	public async run(
		_client: Lavamusic,
		ctx: Context,
		args: string[]
	): Promise<any> {
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

		let type: string = "tracks";
		if (ctx.isInteraction) {
			try {
				const typeValue = ctx.options.get("type")?.value;
				type = (typeof typeValue === 'string' ? typeValue : "tracks") || "tracks";
			} catch {
				type = "tracks";
			}
		} else if (args[0]) {
			type = args[0].toLowerCase();
		}			if (!["tracks", "artists"].includes(type)) {
				type = "tracks";
			}

			const response = await axios.get(
				`https://api.spotify.com/v1/me/top/${type}?limit=10&time_range=medium_term`,
				{
					headers: { Authorization: `Bearer ${accessToken}` },
				}
			);

			const items = response.data.items || [];

			if (items.length === 0) {
				return await ctx.sendMessage({
					embeds: [
						this.client
							.embed()
							.setColor(this.client.color.main)
							.setDescription(`📊 No top ${type} found yet.`),
					],
				});
			}

			let description = "";
			if (type === "tracks") {
				description = items
					.map(
						(t: any, i: number) =>
							`${i + 1}. [${t.name}](${t.external_urls?.spotify}) by ${t.artists
								?.map((a: any) => `[${a.name}](${a.external_urls?.spotify})`)
								.join(", ")}`
					)
					.join("\n");
			} else {
				description = items
					.map(
						(a: any, i: number) =>
							`${i + 1}. [${a.name}](${a.external_urls?.spotify}) • ${a.followers?.total || 0} followers`
					)
					.join("\n");
			}

			const embed = this.client
				.embed()
				.setColor("#1DB954")
				.setAuthor({
					name: `${user.displayName}'s Top ${type.charAt(0).toUpperCase() + type.slice(1)}`,
					iconURL:
						user.profileImage ||
						"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/AdobeSpotifyLogo.svg/1024px-AdobeSpotifyLogo.svg.png",
				})
				.setDescription(description)
				.setFooter({
					text: "Based on medium term listening (last ~6 months)",
				});

			return await ctx.sendMessage({ embeds: [embed] });
		} catch (error) {
			console.error("Error fetching Spotify top items:", error);
			return await ctx.sendMessage({
				embeds: [
					this.client
						.embed()
						.setColor(this.client.color.red)
						.setDescription("❌ Failed to fetch your Spotify top items."),
				],
			});
		}
	}
}

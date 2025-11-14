import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { Command, type Context, type Lavamusic } from "../../structures/index";
import {
	NO_PLAYER_CONFIG,
	createCommandPermissions,
} from "../../utils/commandHelpers";

export default class About extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "about",
			description: {
				content: "cmd.about.description",
				examples: ["about"],
				usage: "about",
			},
			category: "info",
			aliases: ["ab"],
			cooldown: 3,
			args: false,
			player: NO_PLAYER_CONFIG,
			permissions: createCommandPermissions(),
			slashCommand: true,
			options: [],
		});
	}

	public async run(client: Lavamusic, ctx: Context): Promise<any> {
		const inviteButton = new ButtonBuilder()
			.setLabel(ctx.locale("buttons.invite"))
			.setStyle(ButtonStyle.Link)
			.setURL(
				`https://discord.com/api/oauth2/authorize?client_id=${client.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`,
			);
		const supportButton = new ButtonBuilder()
			.setLabel(ctx.locale("buttons.support"))
			.setStyle(ButtonStyle.Link)
			.setURL("https://discord.gg/YQsGbTwPBx");
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			inviteButton,
			supportButton,
		);
		const embed = this.client
			.embed()
			.setAuthor({
				name: "Lavamusic",
				iconURL:
					"https://novaraproject.co.uk/logo.png",
			})
			.setImage(
				"https://novaraproject.co.uk/logo.png",
			)
			.setColor(this.client.color.main)
			.addFields(
				{
					name: ctx.locale("cmd.about.fields.creator"),
					value: "[Riseofpower1](https://github.com/Riseofpower1)",
					inline: true,
				},
				{
					name: ctx.locale("cmd.about.fields.repository"),
					value: "[Here](https://github.com/Riseofpower1/Novara-Music)",
					inline: true,
				},
				{
					name: ctx.locale("cmd.about.fields.support"),
					value: "[Here](https://discord.gg/VZbMKKBvXM)",
					inline: true,
				},
				{
					name: "\u200b",
					value: ctx.locale("cmd.about.fields.description"),
					inline: true,
				},
			);
		await ctx.sendMessage({
			content: "",
			embeds: [embed],
			components: [row],
		});
	}
}


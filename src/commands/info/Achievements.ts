import { Command, type Context, type Lavamusic } from "../../structures/index";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { ACHIEVEMENTS } from "../../achievements";
import { Achievement } from "../../database/models";
import {
	NO_PLAYER_CONFIG,
	createCommandPermissions,
} from "../../utils/commandHelpers";

export default class Achievements extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "achievements",
			description: {
				content: "View your music achievements and progress",
				examples: ["achievements"],
				usage: "achievements",
			},
			category: "info",
			aliases: ["achievement", "badge", "badges"],
			cooldown: 5,
			args: false,
			player: NO_PLAYER_CONFIG,
			permissions: createCommandPermissions(),
			slashCommand: true,
			options: [],
		});
	}

	public async run(_client: Lavamusic, ctx: Context): Promise<any> {
		const userId = ctx.author?.id;
		if (!userId) {
			return await ctx.sendMessage({
				embeds: [
					this.client
						.embed()
						.setColor("#ff0000")
						.setDescription("❌ Unable to determine your user ID"),
				],
			});
		}

		try {
			// Get user achievements from database
			const userAchievements = await Achievement.findOne({
				userId,
				guildId: ctx.guild?.id,
			});

			const unlockedIds = userAchievements?.achievements?.map((a: any) => a.id) || [];
			const totalAchievements = Object.keys(ACHIEVEMENTS).length;

			// Create paginated embeds
			const achievementArray = Object.values(ACHIEVEMENTS);
			const pageSize = 5;
			const totalPages = Math.ceil(achievementArray.length / pageSize);

			if (totalPages === 0) {
				return await ctx.sendMessage({
					embeds: [
						this.client
							.embed()
							.setColor("#ff0000")
							.setDescription("❌ No achievements available"),
					],
				});
			}

			let currentPage = 0;

			const generateEmbed = (page: number) => {
				const start = page * pageSize;
				const end = start + pageSize;
				const pageAchievements = achievementArray.slice(start, end);

				const embed = this.client
					.embed()
					.setColor(this.client.color.main)
					.setTitle(`🏆 Your Achievements`)
					.setDescription(
						`Progress: **${unlockedIds.length}/${totalAchievements}** achievements unlocked`
					)
					.setFooter({
						text: `Page ${page + 1}/${totalPages}`,
					});

				for (const achievement of pageAchievements) {
					const isUnlocked = unlockedIds.includes(achievement.id);
					const unlockedDate = userAchievements?.achievements?.find(
						(a: any) => a.id === achievement.id
					)?.unlockedAt;

					const status = isUnlocked
						? `✅ Unlocked ${new Date(unlockedDate).toLocaleDateString()}`
						: "🔒 Locked";

					embed.addFields({
						name: `${achievement.icon} ${achievement.name}`,
						value: `${achievement.description}\n${status}`,
						inline: false,
					});
				}

				return embed;
			};

			// Create navigation buttons
			const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(`achievements_prev_${userId}`)
					.setLabel("⬅️ Previous")
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(currentPage === 0),
				new ButtonBuilder()
					.setCustomId(`achievements_page_${userId}`)
					.setLabel(`${currentPage + 1}/${totalPages}`)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(true),
				new ButtonBuilder()
					.setCustomId(`achievements_next_${userId}`)
					.setLabel("Next ➡️")
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(currentPage === totalPages - 1)
			);

			return await ctx.sendMessage({
				embeds: [generateEmbed(currentPage)],
				components: totalPages > 1 ? [buttons] : [],
			});
		} catch (error) {
			this.client.logger.error(
				"[Achievements]",
				error instanceof Error ? error.message : String(error)
			);

			return await ctx.sendMessage({
				embeds: [
					this.client
						.embed()
						.setColor("#ff0000")
						.setDescription("❌ Failed to load achievements"),
				],
			});
		}
	}
}

import {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} from "discord.js";
import { Command, type Context, type Lavamusic } from "../../structures/index";
import {
	NO_PLAYER_CONFIG,
	createCommandPermissions,
} from "../../utils/commandHelpers";

export default class Help extends Command {
	constructor(client: Lavamusic) {
		super(client, {
			name: "help",
			description: {
				content: "cmd.help.description",
				examples: ["help"],
				usage: "help",
			},
			category: "info",
			aliases: ["h"],
			cooldown: 3,
			args: false,
			player: NO_PLAYER_CONFIG,
			permissions: createCommandPermissions(),
			slashCommand: true,
			options: [
				{
					name: "command",
					description: "cmd.help.options.command",
					type: 3,
					required: false,
				},
			],
		});
	}

	/**
	 * Generate category-specific embed with organized command groups
	 */
	public static generateCategoryEmbed(
		client: Lavamusic,
		locale: (key: string, params?: any) => string,
		category: string,
		categoryInfo: Record<string, { emoji: string; name: string; order: number; groups?: Record<string, string[]> }>,
		commands: any,
		guild: any,
	): any {
		const categoryData = categoryInfo[category] || { 
			emoji: "📦", 
			name: category.charAt(0).toUpperCase() + category.slice(1) 
		};
		
		const categoryCommands = commands
			.filter((cmd: any) => cmd.category === category)
			.sort((a: any, b: any) => a.name.localeCompare(b.name));

		const embed = client.embed()
			.setColor(client.color.main)
			.setTitle(`${categoryData.emoji} ${categoryData.name} Commands`)
			.setDescription(`All available commands in the **${categoryData.name}** category\n\nUse \`${guild.prefix}help <command>\` for detailed information about a specific command.`)
			.setThumbnail(client.user?.displayAvatarURL({ size: 2048 }) || null)
			.setFooter({
				text: locale("cmd.help.footer", { prefix: guild.prefix }),
				iconURL: client.user?.displayAvatarURL({ size: 128 }),
			})
			.setTimestamp();

		// If category has groups defined, organize by groups
		if (categoryData.groups) {
			const fields: any[] = [];
			
			for (const [groupName, commandNames] of Object.entries(categoryData.groups)) {
				const groupCommands = categoryCommands.filter((cmd: any) => 
					commandNames.includes(cmd.name.toLowerCase())
				);
				
				if (groupCommands.size > 0) {
					const commandList = Array.from(groupCommands.values())
						.map((cmd: any) => `\`${cmd.name}\``)
						.join(", ");
					
					fields.push({
						name: `▸ ${groupName}`,
						value: commandList || "No commands",
						inline: false,
					});
				}
			}
			
			// Add any commands not in groups
			const groupedCommandNames = Object.values(categoryData.groups).flat();
			const ungroupedCommands = categoryCommands.filter((cmd: any) => 
				!groupedCommandNames.includes(cmd.name.toLowerCase())
			);
			
			if (ungroupedCommands.size > 0) {
				const ungroupedList = Array.from(ungroupedCommands.values())
					.map((cmd: any) => `\`${cmd.name}\``)
					.join(", ");
				
				fields.push({
					name: "▸ Other",
					value: ungroupedList,
					inline: false,
				});
			}
			
			embed.addFields(...fields);
		} else {
			// No groups, show all commands in a simple list
			const commandList = Array.from(categoryCommands.values())
				.map((cmd: any) => `\`${cmd.name}\``);
			
			// Format in rows of 3 for better readability
			const rows: string[] = [];
			for (let i = 0; i < commandList.length; i += 3) {
				rows.push(commandList.slice(i, i + 3).join(" "));
			}
			
			embed.addFields({
				name: `All ${categoryData.name} Commands (${categoryCommands.size})`,
				value: rows.join("\n") || "No commands available",
				inline: false,
			});
		}

		return embed;
	}

	/**
	 * Generate the main help embed with all categories
	 */
	public static generateMainHelpEmbed(
		client: Lavamusic,
		locale: (key: string, params?: any) => string,
		categoryInfo: Record<string, { emoji: string; name: string; order: number; groups?: Record<string, string[]> }>,
		sortedCategories: string[],
		commands: any,
		guild: any,
	): any {
		const embed = client.embed()
			.setColor(client.color.main)
			.setTitle(locale("cmd.help.title"))
			.setDescription(
				`${locale("cmd.help.content", {
					bot: client.user?.username,
					prefix: guild.prefix,
				})}\n\n📊 **${commands.size}** commands across **${sortedCategories.length}** categories\n\n👇 **Select a category below to view commands**`,
			)
			.setThumbnail(client.user?.displayAvatarURL({ size: 2048 }) || null)
			.setFooter({
				text: locale("cmd.help.footer", { prefix: guild.prefix }),
				iconURL: client.user?.displayAvatarURL({ size: 128 }),
			})
			.setTimestamp();

		// Add quick overview of all categories
		const overviewFields = sortedCategories.map((category) => {
			const categoryCommands = commands.filter((cmd: any) => cmd.category === category);
			const categoryData = categoryInfo[category] || { 
				emoji: "📦", 
				name: category.charAt(0).toUpperCase() + category.slice(1) 
			};
			
			const commandPreview = categoryCommands
				.map((cmd: any) => `\`${cmd.name}\``)
				.slice(0, 5)
				.join(", ");
			const moreCount = categoryCommands.size > 5 ? ` +${categoryCommands.size - 5} more` : "";
			
			return {
				name: `${categoryData.emoji} ${categoryData.name}`,
				value: `${commandPreview}${moreCount}`,
				inline: true,
			};
		});

		embed.addFields(...overviewFields);
		return embed;
	}

	public async run(
		client: Lavamusic,
		ctx: Context,
		args: string[],
	): Promise<any> {
		const embed = this.client.embed();
		const guild = await client.db.get(ctx.guild.id);
		const commands = this.client.commands.filter(
			(cmd) => cmd.category !== "dev",
		);
		const categories = [...new Set(commands.map((cmd) => cmd.category))];

		if (args[0]) {
			const command = this.client.commands.get(args[0].toLowerCase());
			if (!command) {
				return await ctx.sendMessage({
					embeds: [
						embed.setColor(this.client.color.red).setDescription(
							ctx.locale("cmd.help.not_found", {
								cmdName: args[0],
							}),
						),
					],
				});
			}
			const helpEmbed = embed
				.setColor(client.color.main)
				.setTitle(`${ctx.locale("cmd.help.title")} - ${command.name}`)
				.setDescription(
					ctx.locale("cmd.help.help_cmd", {
						description: ctx.locale(command.description.content),
						usage: `${guild?.prefix}${command.description.usage}`,
						examples: command.description.examples
							.map((example: string) => `${guild.prefix}${example}`)
							.join(", "),
						aliases: command.aliases
							.map((alias: string) => `\`${alias}\``)
							.join(", "),
						category: command.category,
						cooldown: command.cooldown,
						premUser:
							(command.permissions.user as string[]).length > 0
								? (command.permissions.user as string[])
										.map((perm: string) => `\`${perm}\``)
										.join(", ")
								: "None",
						premBot: (command.permissions.client as string[])
							.map((perm: string) => `\`${perm}\``)
							.join(", "),
						dev: command.permissions.dev ? "Yes" : "No",
						slash: command.slashCommand ? "Yes" : "No",
						args: command.args ? "Yes" : "No",
						player: command.player.active ? "Yes" : "No",
						dj: command.player.dj ? "Yes" : "No",
						djPerm: command.player.djPerm ? command.player.djPerm : "None",
						voice: command.player.voice ? "Yes" : "No",
					}),
				);
			return await ctx.sendMessage({ embeds: [helpEmbed] });
		}

		// Category emojis, display names, and command groupings
		const categoryInfo: Record<string, { 
			emoji: string; 
			name: string; 
			order: number;
			groups?: Record<string, string[]>;
		}> = {
			music: { 
				emoji: "🎵", 
				name: "Music", 
				order: 1,
				groups: {
					"Playback": ["play", "search", "skip", "stop", "pause", "resume"],
					"Queue Management": ["queue", "queuehistory", "queueshare", "move", "swap", "remove", "clear"],
					"Playback Control": ["loop", "shuffle", "seek", "forward", "rewind", "volume"],
					"Information": ["nowplaying", "lyrics", "fairplay"],
				}
			},
			filters: { 
				emoji: "🎛️", 
				name: "Audio Filters", 
				order: 2,
				groups: {
					"Effects": ["8d", "bassboost", "nightcore", "karaoke", "tremolo", "vibrato", "rotation"],
					"Control": ["pitch", "rate", "speed", "lowpass", "reset"],
				}
			},
			playlist: { 
				emoji: "📋", 
				name: "Playlists", 
				order: 3,
				groups: {
					"Management": ["create", "delete", "list", "load"],
					"Songs": ["addsong", "removesong", "steal"],
					"Sharing": ["export", "import", "share", "stats"],
				}
			},
			config: { 
				emoji: "⚙️", 
				name: "Configuration", 
				order: 4,
				groups: {
					"Server Settings": ["setup", "prefix", "language", "dj"],
					"Integrations": ["spotifylink", "lastfmlink", "unlink"],
				}
			},
			info: { 
				emoji: "ℹ️", 
				name: "Information", 
				order: 5,
				groups: {
					"Bot Info": ["botinfo", "about", "ping", "invite"],
					"Statistics": ["stats", "lavalink", "achievements"],
				}
			},
			general: { 
				emoji: "🔧", 
				name: "General", 
				order: 6 
			},
		};

		// Sort categories by order
		const sortedCategories = categories.sort((a, b) => {
			const aInfo = categoryInfo[a] || { order: 999, name: a };
			const bInfo = categoryInfo[b] || { order: 999, name: b };
			return aInfo.order - bInfo.order;
		});

		// Create select menu options
		const selectOptions = sortedCategories.map((category) => {
			const categoryData = categoryInfo[category] || { 
				emoji: "📦", 
				name: category.charAt(0).toUpperCase() + category.slice(1) 
			};
			const categoryCommands = commands.filter((cmd) => cmd.category === category);
			
			return new StringSelectMenuOptionBuilder()
				.setLabel(`${categoryData.name} (${categoryCommands.size})`)
				.setDescription(`${categoryCommands.size} command${categoryCommands.size !== 1 ? "s" : ""} available`)
				.setValue(category)
				.setEmoji(categoryData.emoji);
		});

		// Add "View All" option at the beginning
		selectOptions.unshift(
			new StringSelectMenuOptionBuilder()
				.setLabel("📋 View All Categories")
				.setDescription("Show all commands organized by category")
				.setValue("all")
				.setEmoji("📋")
		);

		// Create select menu
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId("help_category_select")
			.setPlaceholder("Select a category to view commands...")
			.addOptions(selectOptions);

		const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
			.addComponents(selectMenu);

		// Create overview embed
		const helpEmbed = Help.generateMainHelpEmbed(
			client,
			ctx.locale.bind(ctx),
			categoryInfo,
			sortedCategories,
			commands,
			guild,
		);

		return await ctx.sendMessage({ 
			embeds: [helpEmbed],
			components: [selectRow],
		});
	}
}


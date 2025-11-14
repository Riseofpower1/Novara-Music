import type {
	ApplicationCommandSubCommandData,
	ApplicationCommandOptionData,
} from "discord.js";
import type { Context } from "../structures/index";

/**
 * Helper utilities for command groups and subcommands
 */

export interface SubcommandHandler {
	name: string;
	description: string;
	handler: (ctx: Context, args: string[]) => Promise<unknown> | unknown;
	options?: ApplicationCommandOptionData[];
}

export interface SubcommandGroupData {
	name: string;
	description: string;
	subcommands: SubcommandHandler[];
}

/**
 * Create a subcommand option for Discord slash commands
 */
export function createSubcommandOption(
	name: string,
	description: string,
	options: ApplicationCommandOptionData[] = [],
): ApplicationCommandSubCommandData {
	return {
		type: 1, // Subcommand
		name,
		description,
		// Type assertion needed due to Discord.js ApplicationCommandOptionData union type complexity
		// The options array can contain various option types, and TypeScript can't narrow them properly
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		options: options as any,
	};
}

/**
 * Create a subcommand group option for Discord slash commands
 */
export function createSubcommandGroupOption(
	name: string,
	description: string,
	subcommands: ApplicationCommandSubCommandData[],
): {
	type: 2; // SubcommandGroup
	name: string;
	description: string;
	options: ApplicationCommandSubCommandData[];
} {
	return {
		type: 2, // SubcommandGroup
		name,
		description,
		options: subcommands,
	};
}

/**
 * Execute a subcommand handler based on the context
 */
export async function executeSubcommand(
	ctx: Context,
	handlers: SubcommandHandler[],
	args: string[] = [],
): Promise<unknown> {
	let subcommandName: string | undefined;

	if (ctx.isInteraction) {
		subcommandName = ctx.options.getSubCommand();
	} else {
		subcommandName = args[0];
	}

	if (!subcommandName) {
		return ctx.sendMessage({
			embeds: [
				ctx.client
					.embed()
					.setColor(ctx.client.color.red)
					.setDescription("Please specify a subcommand."),
			],
		});
	}

	const handler = handlers.find((h) => h.name === subcommandName);

	if (!handler) {
		const availableSubcommands = handlers.map((h) => `\`${h.name}\``).join(", ");
		return ctx.sendMessage({
			embeds: [
				ctx.client
					.embed()
					.setColor(ctx.client.color.red)
					.setDescription(
						`Invalid subcommand. Available subcommands: ${availableSubcommands}`,
					),
			],
		});
	}

	// Remove subcommand name from args for text commands
	const handlerArgs = ctx.isInteraction ? args : args.slice(1);

	return await handler.handler(ctx, handlerArgs);
}

/**
 * Get subcommand name from context (works for both interaction and message)
 */
export function getSubcommandName(ctx: Context, args: string[] = []): string | undefined {
	if (ctx.isInteraction) {
		return ctx.options.getSubCommand();
	}
	return args[0];
}

/**
 * Get subcommand group name from context (for Discord subcommand groups)
 */
export function getSubcommandGroupName(ctx: Context): string | undefined {
	if (ctx.isInteraction && ctx.interaction?.isChatInputCommand()) {
		const subcommandGroup = ctx.interaction.options.getSubcommandGroup(false);
		return subcommandGroup || undefined;
	}
	return undefined;
}

/**
 * Create subcommand options array for Discord slash command registration
 */
export function createSubcommandOptions(
	handlers: SubcommandHandler[],
): ApplicationCommandSubCommandData[] {
	return handlers.map((handler) =>
		createSubcommandOption(handler.name, handler.description, handler.options || []),
	);
}

/**
 * Execute subcommand with group support
 */
export async function executeSubcommandWithGroup(
	ctx: Context,
	groups: Map<string, SubcommandHandler[]>,
	args: string[] = [],
): Promise<unknown> {
	const groupName = getSubcommandGroupName(ctx);
	const subcommandName = getSubcommandName(ctx, args);

	if (groupName) {
		// Handle subcommand group
		const groupHandlers = groups.get(groupName);
		if (!groupHandlers) {
			return ctx.sendMessage({
				embeds: [
					ctx.client
						.embed()
						.setColor(ctx.client.color.red)
						.setDescription(`Invalid subcommand group: ${groupName}`),
				],
			});
		}

		// Find handler within the group
		const handler = groupHandlers.find((h) => h.name === subcommandName);
		if (!handler) {
			const availableSubcommands = groupHandlers
				.map((h) => `\`${h.name}\``)
				.join(", ");
			return ctx.sendMessage({
				embeds: [
					ctx.client
						.embed()
						.setColor(ctx.client.color.red)
						.setDescription(
							`Invalid subcommand in group ${groupName}. Available: ${availableSubcommands}`,
						),
				],
			});
		}

		const handlerArgs = ctx.isInteraction ? args : args.slice(2); // Skip group and subcommand
		return await handler.handler(ctx, handlerArgs);
	} else {
		// Handle direct subcommand (no group)
		// Try to find in a default group or flat handlers
		const defaultHandlers = groups.get("default") || groups.values().next().value || [];
		return executeSubcommand(ctx, defaultHandlers, args);
	}
}


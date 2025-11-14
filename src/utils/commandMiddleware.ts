import type { Command, Context, Lavamusic } from "../structures/index";
import type { Message, Interaction } from "discord.js";
import { handleError } from "./errors";
import Logger from "../structures/Logger";

const logger = new Logger();

export type MiddlewareContext = {
	command: Command;
	client: Lavamusic;
	context: Context;
	message?: Message;
	interaction?: Interaction;
	userId: string;
	guildId?: string;
	channelId?: string;
};

export type MiddlewareResult = {
	success: boolean;
	message?: string;
	stop?: boolean;
};

export type CommandMiddleware = (
	ctx: MiddlewareContext,
) => Promise<MiddlewareResult> | MiddlewareResult;

/**
 * Middleware for logging command execution
 */
export const loggingMiddleware: CommandMiddleware = async (ctx) => {
	const { command, userId, guildId, channelId } = ctx;
	
	logger.info(
		`[COMMAND] ${command.name} executed by ${userId}${guildId ? ` in guild ${guildId}` : ""}${channelId ? ` in channel ${channelId}` : ""}`,
	);
	
	return { success: true };
};

/**
 * Middleware for analytics tracking (non-blocking)
 */
export const analyticsMiddleware: CommandMiddleware = async (ctx) => {
	const { command, userId, guildId } = ctx;
	
	// Fire and forget - don't block command execution
	// Analytics should never slow down user commands
	if (guildId && ctx.client.db && "trackPlay" in ctx.client.db) {
		// Execute analytics in background without awaiting
		(ctx.client.db as { trackPlay: (data: { userId: string; guildId: string; track: { title: string; author: string; length: number; identifier: string; uri: string; isStream: boolean; isSeekable: boolean; position: number } }) => Promise<void> }).trackPlay({
			userId,
			guildId,
			track: {
				title: command.name,
				author: "system",
				length: 0,
				identifier: `command:${command.name}`,
				uri: "",
				isStream: false,
				isSeekable: false,
				position: 0,
			},
		}).catch(() => {
			// Silently fail analytics - don't block command execution
		});
	}
	
	return { success: true };
};

/**
 * Middleware for permission checking (additional to base checks)
 */
export const permissionMiddleware: CommandMiddleware = async (ctx) => {
	// Base permissions are already checked in event handlers
	// This middleware can be used for additional custom permission checks
	
	// Base permissions are already checked in event handlers
	// This middleware can be used for additional custom permission checks
	
	// Example: Check if command is disabled in guild
	if (ctx.guildId && ctx.client.db) {
		// Could add a getDisabledCommands method to database
		// const disabled = await ctx.client.db.getDisabledCommands(ctx.guildId);
		// if (disabled.includes(command.name)) {
		//   return { success: false, message: "This command is disabled in this server.", stop: true };
		// }
	}
	
	return { success: true };
};

/**
 * Default middleware stack
 */
export const defaultMiddleware: CommandMiddleware[] = [
	loggingMiddleware,
	analyticsMiddleware,
	permissionMiddleware,
];

/**
 * Execute middleware stack
 */
export async function executeMiddleware(
	middleware: CommandMiddleware[],
	ctx: MiddlewareContext,
): Promise<MiddlewareResult> {
	for (const mw of middleware) {
		try {
			const result = await mw(ctx);
			if (!result.success || result.stop) {
				return result;
			}
		} catch (error) {
			handleError(error, {
				client: ctx.client,
				commandName: ctx.command.name,
				userId: ctx.userId,
				guildId: ctx.guildId,
				channelId: ctx.channelId,
				additionalContext: { operation: "middleware_execution" },
			});
			// Continue to next middleware on error
		}
	}
	
	return { success: true };
}


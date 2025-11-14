import type Event from "../structures/Event";
import type Lavamusic from "../structures/Lavamusic";
import { handleError } from "./errors";
import Logger from "../structures/Logger";

const logger = new Logger();

export type EventContext = {
	event: Event;
	client: Lavamusic;
	eventName: string;
	args: unknown[];
	timestamp: number;
};

export type EventMiddlewareResult = {
	success: boolean;
	stop?: boolean;
	modifiedArgs?: unknown[];
};

export type EventMiddleware = (
	ctx: EventContext,
) => Promise<EventMiddlewareResult> | EventMiddlewareResult;

/**
 * Middleware for logging event execution
 */
export const eventLoggingMiddleware: EventMiddleware = async (ctx) => {
	const { eventName, args } = ctx;
	
	logger.debug(`[EVENT] ${eventName} fired with ${args.length} argument(s)`);
	
	return { success: true };
};

/**
 * Middleware for event metrics tracking
 */
export const eventMetricsMiddleware: EventMiddleware = async (ctx) => {
	const { eventName, client } = ctx;
	
	try {
		// Track event firing in analytics
		// This could be stored in memory or database
		if (!client.eventMetrics) {
			client.eventMetrics = new Map();
		}
		
		const currentCount = client.eventMetrics.get(eventName) || 0;
		client.eventMetrics.set(eventName, currentCount + 1);
	} catch (error) {
		// Log but don't block event execution
		handleError(error, {
			client: ctx.client,
			additionalContext: { operation: "event_metrics_tracking", eventName },
		});
	}
	
	return { success: true };
};

/**
 * Safely serialize event arguments, handling circular references and non-serializable objects
 */
function safeSerializeArgs(args: unknown[]): unknown[] {
	const visited = new WeakSet<object>();
	
	function serialize(value: unknown): unknown {
		// Handle primitives
		if (value === null || value === undefined) {
			return value;
		}
		
		if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
			return value;
		}
		
		// Handle functions - skip them
		if (typeof value === "function") {
			return "[Function]";
		}
		
		// Handle arrays
		if (Array.isArray(value)) {
			return value.map(serialize);
		}
		
		// Handle objects
		if (typeof value === "object") {
			// Check for circular reference
			if (visited.has(value)) {
				return "[Circular]";
			}
			
			// Skip non-serializable objects
			if (value instanceof Error) {
				return {
					name: value.name,
					message: value.message,
					stack: value.stack,
				};
			}
			
			// Skip Node.js built-in objects with circular references
			if (
				value.constructor &&
				(value.constructor.name === "Timeout" ||
					value.constructor.name === "Immediate" ||
					value.constructor.name === "Interval" ||
					value.constructor.name === "Client" ||
					value.constructor.name === "Lavamusic")
			) {
				return `[${value.constructor.name}]`;
			}
			
			// Check if it has an id property (Discord objects)
			if ("id" in value && typeof (value as { id: unknown }).id === "string") {
				return {
					id: (value as { id: string }).id,
					type: value.constructor?.name || "Object",
				};
			}
			
			// Mark as visited
			visited.add(value);
			
			try {
				const result: Record<string, unknown> = {};
				for (const [key, val] of Object.entries(value)) {
					// Skip internal/private properties
					if (key.startsWith("_") || key === "client") {
						continue;
					}
					
					// Only serialize safe properties
					if (
						typeof key === "string" &&
						(key === "id" ||
							key === "name" ||
							key === "type" ||
							key === "timestamp" ||
							key === "guildId" ||
							key === "channelId" ||
							key === "userId" ||
							key === "messageId")
					) {
						result[key] = serialize(val);
					}
				}
				return result;
			} finally {
				visited.delete(value);
			}
		}
		
		return "[Unknown]";
	}
	
	return args.map(serialize);
}

/**
 * Middleware for event replay recording
 */
export const eventReplayMiddleware: EventMiddleware = async (ctx) => {
	const { eventName, args, timestamp, client } = ctx;
	
	try {
		// Record event for replay functionality
		if (!client.eventReplayBuffer) {
			client.eventReplayBuffer = [];
		}
		
		// Only keep last 1000 events to prevent memory issues
		if (client.eventReplayBuffer.length >= 1000) {
			client.eventReplayBuffer.shift();
		}
		
		// Store event data (safely serialize args to avoid circular references)
		client.eventReplayBuffer.push({
			eventName,
			timestamp,
			args: safeSerializeArgs(args),
		});
	} catch (error) {
		// Log but don't block event execution
		handleError(error, {
			client: ctx.client,
			additionalContext: { operation: "event_replay_recording", eventName },
		});
	}
	
	return { success: true };
};

/**
 * Default event middleware stack
 */
export const defaultEventMiddleware: EventMiddleware[] = [
	eventLoggingMiddleware,
	eventMetricsMiddleware,
	eventReplayMiddleware,
];

/**
 * Execute event middleware stack
 */
export async function executeEventMiddleware(
	middleware: EventMiddleware[],
	ctx: EventContext,
): Promise<EventMiddlewareResult> {
	for (const mw of middleware) {
		try {
			const result = await mw(ctx);
			if (!result.success || result.stop) {
				return result;
			}
			// Apply modified args if any
			if (result.modifiedArgs) {
				ctx.args = result.modifiedArgs;
			}
		} catch (error) {
			handleError(error, {
				client: ctx.client,
				additionalContext: { operation: "event_middleware_execution", eventName: ctx.eventName },
			});
			// Continue to next middleware on error
		}
	}
	
	return { success: true };
}


import type Lavamusic from "../structures/Lavamusic";
import Logger from "../structures/Logger";
import { handleError } from "./errors";

const logger = new Logger();

export interface EventReplayEntry {
	eventName: string;
	timestamp: number;
	args: unknown[];
}

/**
 * Replay events from the replay buffer
 */
export async function replayEvents(
	client: Lavamusic,
	eventName?: string,
	startTime?: number,
	endTime?: number,
): Promise<number> {
	if (!client.eventReplayBuffer || client.eventReplayBuffer.length === 0) {
		logger.warn("[EVENT REPLAY] No events in replay buffer");
		return 0;
	}
	
	let eventsToReplay = client.eventReplayBuffer;
	
	// Filter by event name if specified
	if (eventName) {
		eventsToReplay = eventsToReplay.filter((e) => e.eventName === eventName);
	}
	
	// Filter by time range if specified
	if (startTime) {
		eventsToReplay = eventsToReplay.filter((e: EventReplayEntry) => e.timestamp >= startTime);
	}
	if (endTime) {
		eventsToReplay = eventsToReplay.filter((e: EventReplayEntry) => e.timestamp <= endTime);
	}
	
	if (eventsToReplay.length === 0) {
		logger.warn("[EVENT REPLAY] No events match the replay criteria");
		return 0;
	}
	
	logger.info(`[EVENT REPLAY] Replaying ${eventsToReplay.length} event(s)`);
	
	let replayed = 0;
	
	for (const entry of eventsToReplay) {
		try {
			const event = client.events?.get(entry.eventName);
			if (event) {
				await event.run(...entry.args);
				replayed++;
			} else {
				logger.warn(`[EVENT REPLAY] Event handler not found: ${entry.eventName}`);
			}
		} catch (error) {
			handleError(error, {
				client,
				additionalContext: {
					operation: "event_replay",
					eventName: entry.eventName,
					timestamp: entry.timestamp,
				},
			});
		}
	}
	
	logger.info(`[EVENT REPLAY] Successfully replayed ${replayed} event(s)`);
	return replayed;
}

/**
 * Clear the event replay buffer
 */
export function clearEventReplayBuffer(client: Lavamusic): void {
	if (client.eventReplayBuffer) {
		const count = client.eventReplayBuffer.length;
		client.eventReplayBuffer = [];
		logger.info(`[EVENT REPLAY] Cleared ${count} event(s) from replay buffer`);
	}
}

/**
 * Get events from replay buffer
 */
export function getReplayEvents(
	client: Lavamusic,
	eventName?: string,
	limit?: number,
): EventReplayEntry[] {
	if (!client.eventReplayBuffer) {
		return [];
	}
	
	let events = client.eventReplayBuffer;
	
	if (eventName) {
		events = events.filter((e: EventReplayEntry) => e.eventName === eventName);
	}
	
	// Sort by timestamp (newest first)
	events.sort((a: EventReplayEntry, b: EventReplayEntry) => b.timestamp - a.timestamp);
	
	if (limit) {
		events = events.slice(0, limit);
	}
	
	return events;
}

/**
 * Export replay buffer to JSON
 */
export function exportReplayBuffer(client: Lavamusic): string {
	if (!client.eventReplayBuffer) {
		return JSON.stringify([], null, 2);
	}
	
	return JSON.stringify(client.eventReplayBuffer, null, 2);
}

/**
 * Import replay buffer from JSON
 */
export function importReplayBuffer(client: Lavamusic, json: string): number {
	try {
		const events = JSON.parse(json) as EventReplayEntry[];
		
		if (!Array.isArray(events)) {
			throw new Error("Invalid replay buffer format");
		}
		
		if (!client.eventReplayBuffer) {
			client.eventReplayBuffer = [];
		}
		
		client.eventReplayBuffer.push(...events);
		
		// Limit to 1000 events
		if (client.eventReplayBuffer.length > 1000) {
			client.eventReplayBuffer = client.eventReplayBuffer.slice(-1000);
		}
		
		logger.info(`[EVENT REPLAY] Imported ${events.length} event(s) into replay buffer`);
		return events.length;
	} catch (error) {
		handleError(error, {
			client,
			additionalContext: { operation: "import_replay_buffer" },
		});
		throw error;
	}
}


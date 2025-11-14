import type Lavamusic from "../structures/Lavamusic";
import Logger from "../structures/Logger";

const logger = new Logger();

export interface EventMetrics {
	eventName: string;
	count: number;
	lastFired: number;
	averageInterval?: number;
	errors: number;
}

export interface EventReplayEntry {
	eventName: string;
	timestamp: number;
	args: unknown[];
}

/**
 * Get event metrics for a specific event
 */
export function getEventMetrics(
	client: Lavamusic,
	eventName: string,
): EventMetrics | null {
	if (!client.eventMetrics) {
		return null;
	}
	
	const count = client.eventMetrics.get(eventName) || 0;
	const errors = client.eventErrors?.get(eventName) || 0;
	
	return {
		eventName,
		count,
		lastFired: client.eventLastFired?.get(eventName) || 0,
		errors,
	};
}

/**
 * Get all event metrics
 */
export function getAllEventMetrics(client: Lavamusic): EventMetrics[] {
	if (!client.eventMetrics) {
		return [];
	}
	
	const metrics: EventMetrics[] = [];
	
	for (const [eventName, count] of client.eventMetrics.entries()) {
		const errors = client.eventErrors?.get(eventName) || 0;
		metrics.push({
			eventName,
			count,
			lastFired: client.eventLastFired?.get(eventName) || 0,
			errors,
		});
	}
	
	return metrics.sort((a, b) => b.count - a.count);
}

/**
 * Reset event metrics
 */
export function resetEventMetrics(client: Lavamusic, eventName?: string): void {
	if (eventName) {
		client.eventMetrics?.delete(eventName);
		client.eventErrors?.delete(eventName);
		client.eventLastFired?.delete(eventName);
	} else {
		client.eventMetrics?.clear();
		client.eventErrors?.clear();
		client.eventLastFired?.clear();
	}
	
	logger.info(`[EVENT METRICS] Reset metrics${eventName ? ` for ${eventName}` : " for all events"}`);
}

/**
 * Get event error rate
 */
export function getEventErrorRate(client: Lavamusic, eventName: string): number {
	if (!client.eventMetrics || !client.eventErrors) {
		return 0;
	}
	
	const count = client.eventMetrics.get(eventName) || 0;
	const errors = client.eventErrors.get(eventName) || 0;
	
	if (count === 0) return 0;
	return (errors / count) * 100;
}

/**
 * Log event metrics summary
 */
export function logEventMetricsSummary(client: Lavamusic): void {
	const metrics = getAllEventMetrics(client);
	
	if (metrics.length === 0) {
		logger.info("[EVENT METRICS] No event metrics available");
		return;
	}
	
	logger.info(`[EVENT METRICS] Summary (${metrics.length} events):`);
	
	const topEvents = metrics.slice(0, 10);
	for (const metric of topEvents) {
		const errorRate = getEventErrorRate(client, metric.eventName);
		logger.info(
			`  ${metric.eventName}: ${metric.count} fires, ${metric.errors} errors (${errorRate.toFixed(2)}% error rate)`,
		);
	}
}


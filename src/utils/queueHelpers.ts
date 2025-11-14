import type { Player, Track, UnresolvedTrack } from "lavalink-client";
import type { Requester } from "../types";

export interface QueuePosition {
	index: number;
	track: Track | UnresolvedTrack;
	estimatedTimeUntilPlay: number; // in milliseconds
	requesterId: string;
}

export interface QueueHistoryEntry {
	track: Track | UnresolvedTrack;
	playedAt: number; // timestamp
	requesterId: string;
}

/**
 * Get queue position with estimated time until play
 */
export function getQueuePosition(
	player: Player,
	index: number,
): QueuePosition | null {
	if (index < 0 || index >= player.queue.tracks.length) {
		return null;
	}

	const track = player.queue.tracks[index];
	const requester = track.requester as Requester | undefined;
	const requesterId = requester?.id || "unknown";

	// Calculate estimated time until this track plays
	let estimatedTime = 0;
	const currentTrack = player.queue.current;

	// Add remaining time of current track
	if (currentTrack && player.playing && !player.paused) {
		const position = player.position || 0;
		const duration = currentTrack.info.duration || 0;
		estimatedTime += Math.max(0, duration - position);
	}

	// Add duration of all tracks before this one
	for (let i = 0; i < index; i++) {
		const prevTrack = player.queue.tracks[i];
		estimatedTime += prevTrack.info.duration || 0;
	}

	return {
		index: index + 1, // 1-based for display
		track,
		estimatedTimeUntilPlay: estimatedTime,
		requesterId,
	};
}

/**
 * Get all queue positions with estimated times
 */
export function getAllQueuePositions(player: Player): QueuePosition[] {
	const positions: QueuePosition[] = [];

	for (let i = 0; i < player.queue.tracks.length; i++) {
		const position = getQueuePosition(player, i);
		if (position) {
			positions.push(position);
		}
	}

	return positions;
}

/**
 * Get queue history from previous tracks
 */
export function getQueueHistory(player: Player): QueueHistoryEntry[] {
	const history: QueueHistoryEntry[] = [];
	
	// Try to access previous tracks from queue
	// Lavalink stores previous tracks in queue.previous array
	try {
		// Type assertion needed because Lavalink doesn't expose previous tracks in public API
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const queue = player.queue as any;
		const previousTracks: Track[] = queue.previous || queue.previousTracks || [];

		// Previous tracks are in reverse order (most recent first)
		for (const track of previousTracks) {
			if (!track) continue;
			const requester = track.requester as Requester | undefined;
	const requesterId = requester?.id || "unknown";
			history.push({
				track,
				playedAt: Date.now(), // Approximate, Lavalink doesn't provide exact timestamp
				requesterId,
			});
		}

		return history.reverse(); // Return in chronological order
	} catch (error) {
		// If previous tracks are not available, return empty array
		return [];
	}
}

/**
 * Export queue to shareable format
 */
export function exportQueue(player: Player): {
	current: Track | UnresolvedTrack | null;
	queue: Array<{
		title: string;
		uri: string | undefined;
		author: string | undefined;
		duration: number;
		requesterId: string;
	}>;
	history: Array<{
		title: string;
		uri: string | undefined;
		author: string | undefined;
		duration: number;
		requesterId: string;
	}>;
} {
	const current = player.queue.current;
	const queue = player.queue.tracks.map((track) => ({
		title: track.info.title,
		uri: track.info.uri,
		author: track.info.author,
		duration: track.info.duration || 0,
		requesterId: ((track.requester as Requester | undefined)?.id || "unknown"),
	}));

	const history = getQueueHistory(player).map((entry) => ({
		title: entry.track.info.title,
		uri: entry.track.info.uri,
		author: entry.track.info.author,
		duration: entry.track.info.duration || 0,
		requesterId: entry.requesterId,
	}));

	return {
		current: current || null,
		queue,
		history,
	};
}

/**
 * Move track from one position to another
 */
export async function moveTrack(
	player: Player,
	fromIndex: number,
	toIndex: number,
): Promise<boolean> {
	if (
		fromIndex < 0 ||
		fromIndex >= player.queue.tracks.length ||
		toIndex < 0 ||
		toIndex >= player.queue.tracks.length ||
		fromIndex === toIndex
	) {
		return false;
	}

	const track = player.queue.tracks[fromIndex];
	
	// Remove from original position
	await player.queue.splice(fromIndex, 1);
	
	// Insert at new position
	if (toIndex > fromIndex) {
		// Adjust index since we removed one before
		await player.queue.splice(toIndex - 1, 0, track);
	} else {
		await player.queue.splice(toIndex, 0, track);
	}

	return true;
}

/**
 * Swap two tracks in the queue
 */
export async function swapTracks(
	player: Player,
	index1: number,
	index2: number,
): Promise<boolean> {
	if (
		index1 < 0 ||
		index1 >= player.queue.tracks.length ||
		index2 < 0 ||
		index2 >= player.queue.tracks.length ||
		index1 === index2
	) {
		return false;
	}

	const track1 = player.queue.tracks[index1];
	const track2 = player.queue.tracks[index2];

	// Swap using splice
	await player.queue.splice(index1, 1, track2);
	await player.queue.splice(index2, 1, track1);

	return true;
}

/**
 * Move track to top of queue
 */
export async function moveToTop(player: Player, index: number): Promise<boolean> {
	return moveTrack(player, index, 0);
}

/**
 * Move track to bottom of queue
 */
export async function moveToBottom(
	player: Player,
	index: number,
): Promise<boolean> {
	if (index < 0 || index >= player.queue.tracks.length) {
		return false;
	}
	return moveTrack(player, index, player.queue.tracks.length - 1);
}

/**
 * Reorder queue by requester (group tracks by same requester)
 */
export async function reorderByRequester(player: Player): Promise<void> {
	const tracks = [...player.queue.tracks];
	const requesterMap = new Map<string, (Track | UnresolvedTrack)[]>();

	// Group tracks by requester
	for (const track of tracks) {
		const requester = track.requester as Requester | undefined;
	const requesterId = requester?.id || "unknown";
		if (!requesterMap.has(requesterId)) {
			requesterMap.set(requesterId, []);
		}
		requesterMap.get(requesterId)!.push(track);
	}

	// Rebuild queue grouped by requester
	const reordered: (Track | UnresolvedTrack)[] = [];
	for (const trackList of requesterMap.values()) {
		reordered.push(...trackList);
	}

	// Clear and rebuild queue
	await player.queue.splice(0, player.queue.tracks.length);
	await player.queue.add(reordered);
}

/**
 * Reorder queue by duration (shortest first or longest first)
 */
export async function reorderByDuration(
	player: Player,
	shortestFirst: boolean = true,
): Promise<void> {
	const tracks = [...player.queue.tracks];

	tracks.sort((a, b) => {
		const durationA = a.info.duration || 0;
		const durationB = b.info.duration || 0;
		return shortestFirst
			? durationA - durationB
			: durationB - durationA;
	});

	// Clear and rebuild queue
	await player.queue.splice(0, player.queue.tracks.length);
	await player.queue.add(tracks);
}

/**
 * Get queue statistics
 */
export function getQueueStats(player: Player): {
	totalTracks: number;
	totalDuration: number;
	uniqueRequesters: number;
	averageDuration: number;
	longestTrack: Track | UnresolvedTrack | null;
	shortestTrack: Track | UnresolvedTrack | null;
} {
	const tracks = player.queue.tracks;
	const requesterSet = new Set<string>();

	let totalDuration = 0;
	let longestTrack: Track | UnresolvedTrack | null = null;
	let shortestTrack: Track | UnresolvedTrack | null = null;
	let longestDuration = 0;
	let shortestDuration = Infinity;

	for (const track of tracks) {
		const requester = track.requester as Requester | undefined;
	const requesterId = requester?.id || "unknown";
		requesterSet.add(requesterId);

		const duration = track.info.duration || 0;
		totalDuration += duration;

		if (duration > longestDuration) {
			longestDuration = duration;
			longestTrack = track;
		}

		if (duration < shortestDuration && duration > 0) {
			shortestDuration = duration;
			shortestTrack = track;
		}
	}

	return {
		totalTracks: tracks.length,
		totalDuration,
		uniqueRequesters: requesterSet.size,
		averageDuration: tracks.length > 0 ? totalDuration / tracks.length : 0,
		longestTrack,
		shortestTrack,
	};
}


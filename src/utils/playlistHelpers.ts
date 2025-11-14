import type Lavamusic from "../structures/Lavamusic";
import type { IPlaylist } from "../database/server";

export interface PlaylistPermission {
	userId: string;
	permission: "read" | "write";
}

export interface PlaylistStats {
	totalTracks: number;
	totalDuration: number; // in milliseconds (estimated)
	averageDuration: number;
	playCount: number;
	lastPlayedAt: Date | null;
	createdAt: Date | null;
	updatedAt: Date | null;
	collaborators: number;
	sharedWith: number;
}

export interface PlaylistExport {
	name: string;
	description?: string;
	tracks: Array<{
		title: string;
		uri: string;
		author: string;
		duration: number;
	}>;
	metadata: {
		createdAt: string;
		updatedAt: string;
		trackCount: number;
	};
}

/**
 * Check if user has permission to access playlist
 */
export function hasPlaylistAccess(
	playlist: IPlaylist & { isPublic?: boolean; collaborators?: PlaylistPermission[]; sharedWith?: PlaylistPermission[] },
	userId: string,
	requiredPermission: "read" | "write" = "read",
): boolean {
	// Owner always has full access
	if (playlist.userId === userId) {
		return true;
	}

	// Check if playlist is public (read-only for public)
	if (playlist.isPublic && requiredPermission === "read") {
		return true;
	}

	// Check collaborators
	if (playlist.collaborators) {
		const collaborator = playlist.collaborators.find((c) => c.userId === userId);
		if (collaborator) {
			if (requiredPermission === "read") return true;
			if (requiredPermission === "write" && collaborator.permission === "write") return true;
		}
	}

	// Check shared with
	if (playlist.sharedWith) {
		const shared = playlist.sharedWith.find((s) => s.userId === userId);
		if (shared) {
			if (requiredPermission === "read") return true;
			if (requiredPermission === "write" && shared.permission === "write") return true;
		}
	}

	return false;
}

/**
 * Get playlist statistics
 */
export async function getPlaylistStats(
	client: Lavamusic,
	userId: string,
	playlistName: string,
): Promise<PlaylistStats | null> {
	const playlist = await client.db.getPlaylist(userId, playlistName);
	if (!playlist) return null;

	const tracks = await client.db.getTracksFromPlaylist(userId, playlistName);
	
	// Estimate total duration (decode tracks to get duration)
	let totalDuration = 0;
	try {
		const nodes = client.manager.nodeManager.leastUsedNodes();
		if (nodes && nodes.length > 0) {
			const node = nodes[0];
			// Type assertion needed because Lavalink's multipleTracks accepts string[] but types are complex
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const decodedTracks = await node.decode.multipleTracks(tracks as any, null);
			totalDuration = decodedTracks.reduce((sum: number, track: { info: { duration?: number } }) => sum + (track.info.duration || 0), 0);
		}
	} catch (error) {
		// If decoding fails, just use 0
		totalDuration = 0;
	}

	const playlistData = playlist as import("../types/playlist").ExtendedPlaylist;
	
	return {
		totalTracks: tracks?.length || 0,
		totalDuration,
		averageDuration: tracks && tracks.length > 0 ? totalDuration / tracks.length : 0,
		playCount: playlistData.playCount || 0,
		lastPlayedAt: playlistData.lastPlayedAt || null,
		createdAt: playlistData.createdAt || null,
		updatedAt: playlistData.updatedAt || null,
		collaborators: playlistData.collaborators?.length || 0,
		sharedWith: playlistData.sharedWith?.length || 0,
	};
}

/**
 * Export playlist to JSON format
 */
export async function exportPlaylist(
	client: Lavamusic,
	userId: string,
	playlistName: string,
): Promise<PlaylistExport | null> {
	const playlist = await client.db.getPlaylist(userId, playlistName);
	if (!playlist) return null;

	const tracks = await client.db.getTracksFromPlaylist(userId, playlistName);
	
	// Decode tracks to get metadata
	const exportedTracks: PlaylistExport["tracks"] = [];
	try {
		const nodes = client.manager.nodeManager.leastUsedNodes();
		if (nodes && nodes.length > 0) {
			const node = nodes[0];
			// Type assertion needed because Lavalink's multipleTracks accepts string[] but types are complex
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const decodedTracks = await node.decode.multipleTracks(tracks as any, null);
			exportedTracks.push(...decodedTracks.map((track: { info: { title: string; uri: string; author: string; duration?: number } }) => ({
				title: track.info.title,
				uri: track.info.uri,
				author: track.info.author,
				duration: track.info.duration || 0,
			})));
		} else {
			// If no nodes, just use track strings
			if (tracks) {
				tracks.forEach((track: string) => {
					exportedTracks.push({
						title: track,
						uri: track,
						author: "Unknown",
						duration: 0,
					});
				});
			}
		}
	} catch (error) {
		// If decoding fails, use track strings
		if (tracks) {
			tracks.forEach((track: string) => {
				exportedTracks.push({
					title: track,
					uri: track,
					author: "Unknown",
					duration: 0,
				});
			});
		}
	}

	const playlistData = playlist as import("../types/playlist").ExtendedPlaylist;
	
	return {
		name: playlist.name,
		description: playlistData.description,
		tracks: exportedTracks,
		metadata: {
			createdAt: playlistData.createdAt?.toISOString() || new Date().toISOString(),
			updatedAt: playlistData.updatedAt?.toISOString() || new Date().toISOString(),
			trackCount: exportedTracks.length,
		},
	};
}

/**
 * Import playlist from JSON format
 */
export async function importPlaylist(
	client: Lavamusic,
	userId: string,
	importData: PlaylistExport,
	overwrite: boolean = false,
): Promise<{ success: boolean; message: string }> {
	try {
		// Check if playlist exists
		const existing = await client.db.getPlaylist(userId, importData.name.toLowerCase());
		
		if (existing && !overwrite) {
			return {
				success: false,
				message: `Playlist "${importData.name}" already exists. Use overwrite option to replace it.`,
			};
		}

		// Create or update playlist
		if (existing && overwrite) {
			// Clear existing tracks
			await client.db.deleteSongsFromPlaylist(userId, importData.name.toLowerCase());
		} else if (!existing) {
			// Create new playlist
			await client.db.createPlaylist(userId, importData.name.toLowerCase());
		}

		// Add tracks (convert to encoded format)
		const trackStrings = importData.tracks.map((track) => track.uri);
		await client.db.addTracksToPlaylist(userId, importData.name.toLowerCase(), trackStrings);

		// Update description if provided
		if (importData.description) {
			// This would require a new database method to update description
			// For now, we'll skip it
		}

		return {
			success: true,
			message: `Successfully ${existing && overwrite ? "updated" : "imported"} playlist "${importData.name}" with ${trackStrings.length} tracks.`,
		};
	} catch (error) {
		return {
			success: false,
			message: `Failed to import playlist: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}

/**
 * Add collaborator to playlist
 */
export async function addCollaborator(
	client: Lavamusic,
	ownerId: string,
	playlistName: string,
	_collaboratorId: string,
	_permission: "read" | "write" = "write",
): Promise<{ success: boolean; message: string }> {
	try {
		const playlist = await client.db.getPlaylist(ownerId, playlistName);
		if (!playlist) {
			return { success: false, message: "Playlist not found." };
		}

		// This would require a new database method
		// For now, return a placeholder
		return {
			success: false,
			message: "Collaborator feature requires database method implementation.",
		};
	} catch (error) {
		return {
			success: false,
			message: `Failed to add collaborator: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}

/**
 * Share playlist with user
 */
export async function sharePlaylist(
	client: Lavamusic,
	ownerId: string,
	playlistName: string,
	_userId: string,
	_permission: "read" | "write" = "read",
): Promise<{ success: boolean; message: string }> {
	try {
		const playlist = await client.db.getPlaylist(ownerId, playlistName);
		if (!playlist) {
			return { success: false, message: "Playlist not found." };
		}

		// This would require a new database method
		// For now, return a placeholder
		return {
			success: false,
			message: "Sharing feature requires database method implementation.",
		};
	} catch (error) {
		return {
			success: false,
			message: `Failed to share playlist: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}


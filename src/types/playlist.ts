import type { IPlaylist } from "../database/server";

export interface PlaylistPermission {
	userId: string;
	permission: "read" | "write";
}

export interface ExtendedPlaylist extends IPlaylist {
	isCollaborative?: boolean;
	collaborators?: PlaylistPermission[];
	isPublic?: boolean;
	sharedWith?: PlaylistPermission[];
	playCount?: number;
	lastPlayedAt?: Date;
	description?: string;
	createdAt?: Date;
	updatedAt?: Date;
}


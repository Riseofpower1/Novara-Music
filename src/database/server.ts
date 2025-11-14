import mongoose from "mongoose";
import { env } from "../env";
import { Guild, Setup, Stay, Dj, Role, Playlist } from "./models";
import { DatabaseError } from "../utils/errors";
import Logger from "../structures/Logger";
import {
	deleteWithError,
	findOneAndUpdateWithError,
	findOneWithError,
	findWithError,
	withDatabaseOperation,
} from "./dbHelpers";
import { getGuildCache } from "../utils/guildCache";

const logger = new Logger();

export interface IGuild {
	guildId: string;
	prefix: string;
	language: string;
}

export interface ISetup {
	guildId: string;
	textId: string;
	messageId: string;
}

export interface IStay {
	guildId: string;
	textId: string;
	voiceId: string;
}

export interface IDj {
	guildId: string;
	mode: boolean;
}

export interface IRole {
	guildId: string;
	roleId: string;
}

export interface IPlaylist {
	userId: string;
	name: string;
	tracks: string[];
}

export default class ServerData {
	private static connected = false;

	constructor() {
		if (!ServerData.connected) {
			this.connect();
		}
	}

	private async connect(): Promise<void> {
		try {
			if (!env.DATABASE_URL) {
				throw new DatabaseError(
					"DATABASE_URL is not defined in environment variables",
					"connect",
					false,
				);
			}

			await mongoose.connect(env.DATABASE_URL, {
				retryWrites: true,
				w: "majority",
				// Connection pooling optimization
				maxPoolSize: 10, // Maximum number of connections in the pool
				minPoolSize: 2, // Minimum number of connections to maintain
				maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
				serverSelectionTimeoutMS: 5000, // Timeout for server selection
				socketTimeoutMS: 45000, // Timeout for socket operations
				// Buffer commands if connection is not ready
				bufferCommands: true,
 // Disable mongoose buffering (use connection pooling instead)
			});

			ServerData.connected = true;
			logger.success("Connected to MongoDB");
		} catch (error) {
			const dbError = new DatabaseError(
				`Failed to connect to MongoDB: ${error instanceof Error ? error.message : String(error)}`,
				"connect",
				true, // Retryable
				{
					databaseUrl: env.DATABASE_URL ? "configured" : "missing",
				},
			);

			logger.error("Failed to connect to MongoDB:", dbError.toLogFormat());
			throw dbError;
		}
	}

	// Guild methods
	public async get(guildId: string): Promise<IGuild> {
		return withDatabaseOperation(
			async () => {
				let guild = await findOneWithError<{ toObject: () => IGuild }>(Guild, { guildId }, "get_guild");
				if (!guild) {
					guild = await this.createGuild(guildId);
				}
				if (!guild) {
					throw new Error("Failed to create guild");
				}
				return guild.toObject();
			},
			"get_guild",
		);
	}

	private async createGuild(guildId: string): Promise<any> {
		return findOneAndUpdateWithError(
			Guild,
			{ guildId },
			{
				$setOnInsert: {
					guildId,
					prefix: env.PREFIX,
					language: env.DEFAULT_LANGUAGE,
				},
			},
			{ upsert: true, new: true },
			"create_guild",
		);
	}

	public async setPrefix(guildId: string, prefix: string): Promise<void> {
		await findOneAndUpdateWithError(
			Guild,
			{ guildId },
			{ prefix },
			{ upsert: true, new: true },
			"set_prefix",
		);
		// Invalidate cache
		getGuildCache().invalidate(guildId, "guild");
	}

	public async getPrefix(guildId: string): Promise<string> {
		return withDatabaseOperation(
			async () => {
				const guild = await this.get(guildId);
				return guild?.prefix ?? env.PREFIX;
			},
			"get_prefix",
			env.PREFIX,
		);
	}

	public async updateLanguage(guildId: string, language: string): Promise<void> {
		await findOneAndUpdateWithError(
			Guild,
			{ guildId },
			{ language },
			{ upsert: true, new: true },
			"update_language",
		);
		// Invalidate cache
		getGuildCache().invalidate(guildId, "language");
		getGuildCache().invalidate(guildId, "guild");
	}

	public async getLanguage(guildId: string): Promise<string> {
		const cache = getGuildCache();
		const cached = cache.get<string>(guildId, "language");
		if (cached !== null) {
			return cached;
		}

		const language = await withDatabaseOperation(
			async () => {
				const guild = await this.get(guildId);
				return guild?.language ?? env.DEFAULT_LANGUAGE;
			},
			"get_language",
			env.DEFAULT_LANGUAGE,
		);

		cache.set(guildId, "language", language);
		return language;
	}

	// Setup methods
	public async getSetup(guildId: string): Promise<ISetup | null> {
		const cache = getGuildCache();
		const cached = cache.get<ISetup | null>(guildId, "setup");
		if (cached !== null) {
			return cached;
		}

		const setup = await withDatabaseOperation(
			async () => {
				const setupDoc = await findOneWithError<{ toObject: () => ISetup }>(Setup, { guildId }, "get_setup");
				return setupDoc ? setupDoc.toObject() : null;
			},
			"get_setup",
			null,
		);

		cache.set(guildId, "setup", setup);
		return setup;
	}

	public async setSetup(
		guildId: string,
		textId: string,
		messageId: string,
	): Promise<void> {
		await findOneAndUpdateWithError(
			Setup,
			{ guildId },
			{ textId, messageId },
			{ upsert: true, new: true },
			"set_setup",
		);
		// Invalidate cache
		getGuildCache().invalidate(guildId, "setup");
	}

	public async deleteSetup(guildId: string): Promise<void> {
		await deleteWithError(Setup, { guildId }, "delete_setup");
		// Invalidate cache
		getGuildCache().invalidate(guildId, "setup");
	}

	// Stay (24/7) methods
	public async set_247(
		guildId: string,
		textId: string,
		voiceId: string,
	): Promise<void> {
		await findOneAndUpdateWithError(
			Stay,
			{ guildId },
			{ textId, voiceId },
			{ upsert: true, new: true },
			"set_247",
		);
	}

	public async delete_247(guildId: string): Promise<void> {
		await deleteWithError(Stay, { guildId }, "delete_247");
	}

	public async get_247(guildId?: string): Promise<IStay | IStay[] | null> {
		return withDatabaseOperation(
			async () => {
				if (guildId) {
					const stay = await findOneWithError<{ toObject: () => IStay }>(Stay, { guildId }, "get_247");
					return stay ? stay.toObject() : null;
				}
				const stays = await findWithError<{ toObject: () => IStay }>(Stay, {}, "get_all_247");
				return stays.map((s) => s.toObject());
			},
			"get_247",
		);
	}

	// DJ methods
	public async setDj(guildId: string, mode: boolean): Promise<void> {
		await findOneAndUpdateWithError(
			Dj,
			{ guildId },
			{ mode },
			{ upsert: true, new: true },
			"set_dj",
		);
		// Invalidate cache
		getGuildCache().invalidate(guildId, "dj");
	}

	public async getDj(guildId: string): Promise<IDj | null> {
		const cache = getGuildCache();
		const cached = cache.get<IDj | null>(guildId, "dj");
		if (cached !== null) {
			return cached;
		}

		const dj = await withDatabaseOperation(
			async () => {
				const djDoc = await findOneWithError<{ toObject: () => IDj }>(Dj, { guildId }, "get_dj");
				return djDoc ? djDoc.toObject() : null;
			},
			"get_dj",
			null,
		);

		cache.set(guildId, "dj", dj);
		return dj;
	}

	// Role methods
	public async getRoles(guildId: string): Promise<IRole[]> {
		const cache = getGuildCache();
		const cached = cache.get<IRole[]>(guildId, "roles");
		if (cached !== null) {
			return cached;
		}

		const roles = await withDatabaseOperation(
			async () => {
				const rolesDocs = await findWithError<{ toObject: () => IRole }>(Role, { guildId }, "get_roles");
				return rolesDocs.map((r) => r.toObject());
			},
			"get_roles",
			[],
		);

		cache.set(guildId, "roles", roles);
		return roles;
	}

	public async addRole(guildId: string, roleId: string): Promise<void> {
		await withDatabaseOperation(
			async () => {
				const role = new Role({ guildId, roleId });
				await role.save();
			},
			"add_role",
		);
		// Invalidate cache
		getGuildCache().invalidate(guildId, "roles");
	}

	public async removeRole(guildId: string, roleId: string): Promise<void> {
		await deleteWithError(Role, { guildId, roleId }, "remove_role");
		// Invalidate cache
		getGuildCache().invalidate(guildId, "roles");
	}

	public async clearRoles(guildId: string): Promise<void> {
		await withDatabaseOperation(
			async () => {
				await Role.deleteMany({ guildId });
			},
			"clear_roles",
		);
		// Invalidate cache
		getGuildCache().invalidate(guildId, "roles");
	}

	// Playlist methods
	public async getPlaylist(
		userId: string,
		name: string,
	): Promise<IPlaylist | null> {
		return withDatabaseOperation(
			async () => {
				const playlist = await findOneWithError<{ tracks: string[]; save: () => Promise<void> }>(
					Playlist,
					{ userId, name },
					"get_playlist",
				);
				return playlist ? (playlist as unknown as { toObject: () => IPlaylist }).toObject() : null;
			},
			"get_playlist",
			null,
		);
	}

	public async getUserPlaylists(userId: string): Promise<IPlaylist[]> {
		return withDatabaseOperation(
			async () => {
				const playlists = await findWithError(
					Playlist,
					{ userId },
					"get_user_playlists",
				);
				return playlists.map((p) => (p as { toObject: () => IPlaylist }).toObject());
			},
			"get_user_playlists",
			[],
		);
	}

	public async createPlaylist(userId: string, name: string): Promise<void> {
		return withDatabaseOperation(
			async () => {
				const playlist = new Playlist({ userId, name, tracks: [] });
				await playlist.save();
			},
			"create_playlist",
		);
	}

	public async createPlaylistWithTracks(
		userId: string,
		name: string,
		tracks: string[],
	): Promise<void> {
		return withDatabaseOperation(
			async () => {
				const playlist = new Playlist({ userId, name, tracks });
				await playlist.save();
			},
			"create_playlist_with_tracks",
		);
	}

	public async deletePlaylist(userId: string, name: string): Promise<void> {
		await deleteWithError(Playlist, { userId, name }, "delete_playlist");
	}

	public async deleteSongsFromPlaylist(
		userId: string,
		playlistName: string,
	): Promise<void> {
		await findOneAndUpdateWithError(
			Playlist,
			{ userId, name: playlistName },
			{ tracks: [] },
			{ new: true },
			"delete_songs_from_playlist",
		);
	}

	public async addTracksToPlaylist(
		userId: string,
		playlistName: string,
		tracks: string[],
	): Promise<void> {
		return withDatabaseOperation(
			async () => {
				let playlist = await findOneWithError<{ tracks: string[]; save: () => Promise<void> }>(
					Playlist,
					{ userId, name: playlistName },
					"add_tracks_to_playlist_find",
				);

				if (playlist) {
					playlist.tracks.push(...tracks);
					await playlist.save();
				} else {
					const newPlaylist = new Playlist({
						userId,
						name: playlistName,
						tracks,
					});
					await newPlaylist.save();
				}
			},
			"add_tracks_to_playlist",
		);
	}

	public async removeSong(
		userId: string,
		playlistName: string,
		encodedSong: string,
	): Promise<void> {
		return withDatabaseOperation(
			async () => {
				const playlist = await findOneWithError<{ tracks: string[]; save: () => Promise<void> }>(
					Playlist,
					{ userId, name: playlistName },
					"remove_song_find",
				);
				if (playlist) {
					const index = playlist.tracks.indexOf(encodedSong);
					if (index !== -1) {
						playlist.tracks.splice(index, 1);
						await playlist.save();
					}
				}
			},
			"remove_song",
		);
	}

	public async getTracksFromPlaylist(
		userId: string,
		playlistName: string,
	): Promise<string[] | null> {
		return withDatabaseOperation(
			async () => {
				const playlist = await findOneWithError<{ tracks: string[]; save: () => Promise<void> }>(
					Playlist,
					{ userId, name: playlistName },
					"get_tracks_from_playlist",
				);
				return playlist ? playlist.tracks : null;
			},
			"get_tracks_from_playlist",
			null,
		);
	}

	// Collaborative playlist methods
	public async addCollaborator(
		userId: string,
		playlistName: string,
		collaboratorId: string,
		permission: "read" | "write" = "write",
	): Promise<void> {
		return withDatabaseOperation(
			async () => {
				const playlist = await findOneWithError<{ tracks: string[]; save: () => Promise<void> }>(
					Playlist,
					{ userId, name: playlistName },
					"add_collaborator_find",
				);
				if (playlist) {
					const playlistData = playlist as import("../types/playlist").ExtendedPlaylist & typeof playlist;
					if (!playlistData.collaborators) {
						playlistData.collaborators = [];
					}
					// Remove existing collaborator if present
					playlistData.collaborators = playlistData.collaborators.filter(
						(c: import("../types/playlist").PlaylistPermission) => c.userId !== collaboratorId,
					);
					// Add new collaborator
					playlistData.collaborators.push({ userId: collaboratorId, permission });
					playlistData.isCollaborative = true;
					await playlist.save();
				}
			},
			"add_collaborator",
		);
	}

	public async removeCollaborator(
		userId: string,
		playlistName: string,
		collaboratorId: string,
	): Promise<void> {
		return withDatabaseOperation(
			async () => {
				const playlist = await findOneWithError<{ tracks: string[]; save: () => Promise<void> }>(
					Playlist,
					{ userId, name: playlistName },
					"remove_collaborator_find",
				);
				if (playlist) {
					const playlistData = playlist as import("../types/playlist").ExtendedPlaylist & typeof playlist;
					if (playlistData.collaborators) {
						playlistData.collaborators = playlistData.collaborators.filter(
							(c: import("../types/playlist").PlaylistPermission) => c.userId !== collaboratorId,
						);
						if (playlistData.collaborators.length === 0) {
							playlistData.isCollaborative = false;
						}
						await playlist.save();
					}
				}
			},
			"remove_collaborator",
		);
	}

	public async sharePlaylist(
		userId: string,
		playlistName: string,
		sharedUserId: string,
		permission: "read" | "write" = "read",
	): Promise<void> {
		return withDatabaseOperation(
			async () => {
				const playlist = await findOneWithError<{ tracks: string[]; save: () => Promise<void> }>(
					Playlist,
					{ userId, name: playlistName },
					"share_playlist_find",
				);
				if (playlist) {
					const playlistData = playlist as import("../types/playlist").ExtendedPlaylist & typeof playlist;
					if (!playlistData.sharedWith) {
						playlistData.sharedWith = [];
					}
					// Remove existing share if present
					playlistData.sharedWith = playlistData.sharedWith.filter(
						(s: import("../types/playlist").PlaylistPermission) => s.userId !== sharedUserId,
					);
					// Add new share
					playlistData.sharedWith.push({ userId: sharedUserId, permission });
					await playlist.save();
				}
			},
			"share_playlist",
		);
	}

	public async setPlaylistPublic(
		userId: string,
		playlistName: string,
		isPublic: boolean,
	): Promise<void> {
		return withDatabaseOperation(
			async () => {
				await findOneAndUpdateWithError(
					Playlist,
					{ userId, name: playlistName },
					{ isPublic },
					{ new: true },
					"set_playlist_public",
				);
			},
			"set_playlist_public",
		);
	}

	public async incrementPlaylistPlayCount(
		userId: string,
		playlistName: string,
	): Promise<void> {
		return withDatabaseOperation(
			async () => {
				const playlist = await findOneWithError<{ tracks: string[]; save: () => Promise<void> }>(
					Playlist,
					{ userId, name: playlistName },
					"increment_play_count_find",
				);
				if (playlist) {
					const playlistData = playlist as import("../types/playlist").ExtendedPlaylist & typeof playlist;
					playlistData.playCount = (playlistData.playCount || 0) + 1;
					playlistData.lastPlayedAt = new Date();
					await playlist.save();
				}
			},
			"increment_playlist_play_count",
		);
	}
}



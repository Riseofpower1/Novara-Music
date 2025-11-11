import mongoose from "mongoose";
import { env } from "../env";
import { Guild, Setup, Stay, Dj, Role, Playlist } from "./models";

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
				throw new Error("DATABASE_URL is not defined in environment variables");
			}

			await mongoose.connect(env.DATABASE_URL, {
				retryWrites: true,
				w: "majority",
			});

			ServerData.connected = true;
			console.log("✅ Connected to MongoDB");
		} catch (error) {
			console.error("❌ Failed to connect to MongoDB:", error);
			throw error;
		}
	}

	// Guild methods
	public async get(guildId: string): Promise<IGuild> {
		try {
			let guild = await Guild.findOne({ guildId });
			if (!guild) {
				guild = await this.createGuild(guildId);
			}
			return guild.toObject();
		} catch (error) {
			console.error("Error getting guild:", error);
			throw error;
		}
	}

	private async createGuild(guildId: string): Promise<any> {
		try {
			// Use findOneAndUpdate with upsert instead of save to prevent duplicate key errors
			const guild = await Guild.findOneAndUpdate(
				{ guildId },
				{
					$setOnInsert: {
						guildId,
						prefix: env.PREFIX,
						language: env.DEFAULT_LANGUAGE,
					},
				},
				{ upsert: true, new: true }
			);
			return guild;
		} catch (error) {
			console.error("Error creating guild:", error);
			throw error;
		}
	}

	public async setPrefix(guildId: string, prefix: string): Promise<void> {
		try {
			await Guild.findOneAndUpdate(
				{ guildId },
				{ prefix },
				{ upsert: true, new: true }
			);
		} catch (error) {
			console.error("Error setting prefix:", error);
			throw error;
		}
	}

	public async getPrefix(guildId: string): Promise<string> {
		try {
			const guild = await this.get(guildId);
			return guild?.prefix ?? env.PREFIX;
		} catch (error) {
			console.error("Error getting prefix:", error);
			return env.PREFIX;
		}
	}

	public async updateLanguage(
		guildId: string,
		language: string
	): Promise<void> {
		try {
			await Guild.findOneAndUpdate(
				{ guildId },
				{ language },
				{ upsert: true, new: true }
			);
		} catch (error) {
			console.error("Error updating language:", error);
			throw error;
		}
	}

	public async getLanguage(guildId: string): Promise<string> {
		try {
			const guild = await this.get(guildId);
			return guild?.language ?? env.DEFAULT_LANGUAGE;
		} catch (error) {
			console.error("Error getting language:", error);
			return env.DEFAULT_LANGUAGE;
		}
	}

	// Setup methods
	public async getSetup(guildId: string): Promise<ISetup | null> {
		try {
			const setup = await Setup.findOne({ guildId });
			return setup ? setup.toObject() : null;
		} catch (error) {
			console.error("Error getting setup:", error);
			throw error;
		}
	}

	public async setSetup(
		guildId: string,
		textId: string,
		messageId: string
	): Promise<void> {
		try {
			await Setup.findOneAndUpdate(
				{ guildId },
				{ textId, messageId },
				{ upsert: true, new: true }
			);
		} catch (error) {
			console.error("Error setting setup:", error);
			throw error;
		}
	}

	public async deleteSetup(guildId: string): Promise<void> {
		try {
			await Setup.deleteOne({ guildId });
		} catch (error) {
			console.error("Error deleting setup:", error);
			throw error;
		}
	}

	// Stay (24/7) methods
	public async set_247(
		guildId: string,
		textId: string,
		voiceId: string
	): Promise<void> {
		try {
			await Stay.findOneAndUpdate(
				{ guildId },
				{ textId, voiceId },
				{ upsert: true, new: true }
			);
		} catch (error) {
			console.error("Error setting 247:", error);
			throw error;
		}
	}

	public async delete_247(guildId: string): Promise<void> {
		try {
			await Stay.deleteOne({ guildId });
		} catch (error) {
			console.error("Error deleting 247:", error);
			throw error;
		}
	}

	public async get_247(guildId?: string): Promise<IStay | IStay[] | null> {
		try {
			if (guildId) {
				const stay = await Stay.findOne({ guildId });
				return stay ? stay.toObject() : null;
			}
			const stays = await Stay.find({});
			return stays.map((s) => s.toObject());
		} catch (error) {
			console.error("Error getting 247:", error);
			throw error;
		}
	}

	// DJ methods
	public async setDj(guildId: string, mode: boolean): Promise<void> {
		try {
			await Dj.findOneAndUpdate(
				{ guildId },
				{ mode },
				{ upsert: true, new: true }
			);
		} catch (error) {
			console.error("Error setting DJ mode:", error);
			throw error;
		}
	}

	public async getDj(guildId: string): Promise<IDj | null> {
		try {
			const dj = await Dj.findOne({ guildId });
			return dj ? dj.toObject() : null;
		} catch (error) {
			console.error("Error getting DJ:", error);
			throw error;
		}
	}

	// Role methods
	public async getRoles(guildId: string): Promise<IRole[]> {
		try {
			const roles = await Role.find({ guildId });
			return roles.map((r) => r.toObject());
		} catch (error) {
			console.error("Error getting roles:", error);
			throw error;
		}
	}

	public async addRole(guildId: string, roleId: string): Promise<void> {
		try {
			const role = new Role({ guildId, roleId });
			await role.save();
		} catch (error) {
			console.error("Error adding role:", error);
			throw error;
		}
	}

	public async removeRole(guildId: string, roleId: string): Promise<void> {
		try {
			await Role.deleteOne({ guildId, roleId });
		} catch (error) {
			console.error("Error removing role:", error);
			throw error;
		}
	}

	public async clearRoles(guildId: string): Promise<void> {
		try {
			await Role.deleteMany({ guildId });
		} catch (error) {
			console.error("Error clearing roles:", error);
			throw error;
		}
	}

	// Playlist methods
	public async getPlaylist(
		userId: string,
		name: string
	): Promise<IPlaylist | null> {
		try {
			const playlist = await Playlist.findOne({ userId, name });
			return playlist ? playlist.toObject() : null;
		} catch (error) {
			console.error("Error getting playlist:", error);
			throw error;
		}
	}

	public async getUserPlaylists(userId: string): Promise<IPlaylist[]> {
		try {
			const playlists = await Playlist.find({ userId });
			return playlists.map((p) => p.toObject());
		} catch (error) {
			console.error("Error getting user playlists:", error);
			throw error;
		}
	}

	public async createPlaylist(userId: string, name: string): Promise<void> {
		try {
			const playlist = new Playlist({ userId, name, tracks: [] });
			await playlist.save();
		} catch (error) {
			console.error("Error creating playlist:", error);
			throw error;
		}
	}

	public async createPlaylistWithTracks(
		userId: string,
		name: string,
		tracks: string[]
	): Promise<void> {
		try {
			const playlist = new Playlist({ userId, name, tracks });
			await playlist.save();
		} catch (error) {
			console.error("Error creating playlist with tracks:", error);
			throw error;
		}
	}

	public async deletePlaylist(userId: string, name: string): Promise<void> {
		try {
			await Playlist.deleteOne({ userId, name });
		} catch (error) {
			console.error("Error deleting playlist:", error);
			throw error;
		}
	}

	public async deleteSongsFromPlaylist(
		userId: string,
		playlistName: string
	): Promise<void> {
		try {
			await Playlist.findOneAndUpdate(
				{ userId, name: playlistName },
				{ tracks: [] },
				{ new: true }
			);
		} catch (error) {
			console.error("Error deleting songs from playlist:", error);
			throw error;
		}
	}

	public async addTracksToPlaylist(
		userId: string,
		playlistName: string,
		tracks: string[]
	): Promise<void> {
		try {
			let playlist = await Playlist.findOne({ userId, name: playlistName });

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
		} catch (error) {
			console.error("Error adding tracks to playlist:", error);
			throw error;
		}
	}

	public async removeSong(
		userId: string,
		playlistName: string,
		encodedSong: string
	): Promise<void> {
		try {
			const playlist = await Playlist.findOne({ userId, name: playlistName });
			if (playlist) {
				const index = playlist.tracks.indexOf(encodedSong);
				if (index !== -1) {
					playlist.tracks.splice(index, 1);
					await playlist.save();
				}
			}
		} catch (error) {
			console.error("Error removing song from playlist:", error);
			throw error;
		}
	}

	public async getTracksFromPlaylist(
		userId: string,
		playlistName: string
	): Promise<string[] | null> {
		try {
			const playlist = await Playlist.findOne({ userId, name: playlistName });
			return playlist ? playlist.tracks : null;
		} catch (error) {
			console.error("Error getting tracks from playlist:", error);
			throw error;
		}
	}
}



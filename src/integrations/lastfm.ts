import axios from "axios";
import { LastfmUser } from "../database/models";

const LASTFM_API_URL = "http://ws.audioscrobbler.com/2.0";

export interface ILastfmService {
	scrobbleTrack(
		username: string,
		sessionKey: string,
		track: string,
		artist: string,
		timestamp?: number
	): Promise<boolean>;
	getRecentTracks(username: string, limit?: number): Promise<any[]>;
	getTopTracks(username: string, period?: string): Promise<any[]>;
	getUserInfo(username: string): Promise<any>;
	saveUser(userId: string, lastfmUsername: string, sessionKey: string): Promise<void>;
	getUser(userId: string): Promise<any>;
}

export class LastfmService implements ILastfmService {
	private apiKey: string;

	constructor(apiKey: string, _apiSecret: string) {
		this.apiKey = apiKey;
	}

	async scrobbleTrack(
		username: string,
		sessionKey: string,
		track: string,
		artist: string,
		timestamp?: number
	): Promise<boolean> {
		try {
			const params = {
				method: "track.scrobble",
				track,
				artist,
				username,
				sk: sessionKey,
				api_key: this.apiKey,
				format: "json",
				timestamp: timestamp || Math.floor(Date.now() / 1000),
			};

			const response = await axios.post(LASTFM_API_URL, null, { params });
			return response.data.scrobbles ? true : false;
		} catch (error) {
			console.error("Error scrobbling to Last.fm:", error);
			return false;
		}
	}

	async getRecentTracks(username: string, limit = 10): Promise<any[]> {
		try {
			const params = {
				method: "user.getRecentTracks",
				user: username,
				limit,
				api_key: this.apiKey,
				format: "json",
			};

			const response = await axios.get(LASTFM_API_URL, { params });
			return response.data.recenttracks?.track || [];
		} catch (error) {
			console.error("Error getting recent tracks from Last.fm:", error);
			return [];
		}
	}

	async getTopTracks(username: string, period = "7day"): Promise<any[]> {
		try {
			const params = {
				method: "user.getTopTracks",
				user: username,
				period,
				limit: 10,
				api_key: this.apiKey,
				format: "json",
			};

			const response = await axios.get(LASTFM_API_URL, { params });
			return response.data.toptracks?.track || [];
		} catch (error) {
			console.error("Error getting top tracks from Last.fm:", error);
			return [];
		}
	}

	async getUserInfo(username: string): Promise<any> {
		try {
			const params = {
				method: "user.getInfo",
				user: username,
				api_key: this.apiKey,
				format: "json",
			};

			const response = await axios.get(LASTFM_API_URL, { params });
			return response.data.user || null;
		} catch (error) {
			console.error("Error getting Last.fm user info:", error);
			return null;
		}
	}

	async saveUser(
		userId: string,
		lastfmUsername: string,
		sessionKey: string
	): Promise<void> {
		try {
			await LastfmUser.findOneAndUpdate(
				{ userId },
				{
					lastfmUsername,
					sessionKey,
					scrobbleEnabled: true,
				},
				{ upsert: true, new: true }
			);
		} catch (error) {
			console.error("Error saving Last.fm user:", error);
		}
	}

	async getUser(userId: string): Promise<any> {
		try {
			return await LastfmUser.findOne({ userId });
		} catch (error) {
			console.error("Error getting Last.fm user:", error);
			return null;
		}
	}
}

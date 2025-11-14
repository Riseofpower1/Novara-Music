import axios, { type AxiosError } from "axios";
import { LastfmUser } from "../database/models";
import { APIError, DatabaseError, retryWithBackoff } from "../utils/errors";

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
		timestamp?: number,
	): Promise<boolean> {
		return retryWithBackoff(
			async () => {
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
					const axiosError = error as AxiosError;
					const statusCode = axiosError.response?.status;
					const isRetryable = statusCode !== undefined && (statusCode >= 500 || statusCode === 429);

					throw new APIError(
						`Failed to scrobble track to Last.fm: ${axiosError.message}`,
						"Last.fm",
						statusCode,
						isRetryable,
						{ username, track, artist },
					);
				}
			},
			{ maxRetries: 2 },
		).catch(() => false);
	}

	async getRecentTracks(username: string, limit = 10): Promise<any[]> {
		return retryWithBackoff(
			async () => {
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
					const axiosError = error as AxiosError;
					const statusCode = axiosError.response?.status;
					const isRetryable = statusCode !== undefined && (statusCode >= 500 || statusCode === 429);

					throw new APIError(
						`Failed to get recent tracks from Last.fm: ${axiosError.message}`,
						"Last.fm",
						statusCode,
						isRetryable,
						{ username, limit },
					);
				}
			},
			{ maxRetries: 2 },
		).catch(() => []);
	}

	async getTopTracks(username: string, period = "7day"): Promise<any[]> {
		return retryWithBackoff(
			async () => {
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
					const axiosError = error as AxiosError;
					const statusCode = axiosError.response?.status;
					const isRetryable = statusCode !== undefined && (statusCode >= 500 || statusCode === 429);

					throw new APIError(
						`Failed to get top tracks from Last.fm: ${axiosError.message}`,
						"Last.fm",
						statusCode,
						isRetryable,
						{ username, period },
					);
				}
			},
			{ maxRetries: 2 },
		).catch(() => []);
	}

	async getUserInfo(username: string): Promise<any> {
		return retryWithBackoff(
			async () => {
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
					const axiosError = error as AxiosError;
					const statusCode = axiosError.response?.status;
					const isRetryable = statusCode !== undefined && (statusCode >= 500 || statusCode === 429);

					throw new APIError(
						`Failed to get Last.fm user info: ${axiosError.message}`,
						"Last.fm",
						statusCode,
						isRetryable,
						{ username },
					);
				}
			},
			{ maxRetries: 2 },
		).catch(() => null);
	}

	async saveUser(
		userId: string,
		lastfmUsername: string,
		sessionKey: string,
	): Promise<void> {
		try {
			await LastfmUser.findOneAndUpdate(
				{ userId },
				{
					lastfmUsername,
					sessionKey,
					scrobbleEnabled: true,
				},
				{ upsert: true, new: true },
			);
		} catch (error) {
			throw new DatabaseError(
				`Failed to save Last.fm user: ${error instanceof Error ? error.message : String(error)}`,
				"saveUser",
				true,
				{ userId, lastfmUsername },
			);
		}
	}

	async getUser(userId: string): Promise<any> {
		try {
			return await LastfmUser.findOne({ userId });
		} catch (error) {
			throw new DatabaseError(
				`Failed to get Last.fm user: ${error instanceof Error ? error.message : String(error)}`,
				"getUser",
				true,
				{ userId },
			);
		}
	}
}

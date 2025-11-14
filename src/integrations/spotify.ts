import axios, { type AxiosError } from "axios";
import { SpotifyUser } from "../database/models";
import { APIError, DatabaseError, retryWithBackoff } from "../utils/errors";

const SPOTIFY_API_URL = "https://api.spotify.com/v1";
const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/api/token";

export interface ISpotifyService {
	getUserProfile(accessToken: string): Promise<any>;
	getCurrentTrack(accessToken: string): Promise<any>;
	getPlaylists(accessToken: string): Promise<any[]>;
	getPlaylistTracks(accessToken: string, playlistId: string): Promise<any[]>;
	getTopTracks(accessToken: string, limit?: number): Promise<any[]>;
	getTopArtists(accessToken: string, limit?: number): Promise<any[]>;
	getRecommendations(accessToken: string, seedArtists: string[]): Promise<any[]>;
	saveUser(
		userId: string,
		spotifyId: string,
		accessToken: string,
		refreshToken: string,
		expiresIn: number,
		displayName: string,
		profileImage?: string
	): Promise<void>;
	getUser(userId: string): Promise<any>;
	getAllUsers(): Promise<any[]>;
	refreshToken(userId: string): Promise<string | null>;
}

export class SpotifyService implements ISpotifyService {
	private clientId: string;
	private clientSecret: string;

	constructor(clientId: string, clientSecret: string) {
		this.clientId = clientId;
		this.clientSecret = clientSecret;
	}

	async getUserProfile(accessToken: string): Promise<any> {
		return retryWithBackoff(
			async () => {
				try {
					const response = await axios.get(`${SPOTIFY_API_URL}/me`, {
						headers: { Authorization: `Bearer ${accessToken}` },
					});
					return response.data;
				} catch (error) {
					const axiosError = error as AxiosError;
					const statusCode = axiosError.response?.status;
					const isRetryable = statusCode !== undefined && (statusCode >= 500 || statusCode === 429);

					throw new APIError(
						`Failed to get Spotify profile: ${axiosError.message}`,
						"Spotify",
						statusCode,
						isRetryable,
						{ endpoint: "/me" },
					);
				}
			},
			{
				maxRetries: 3,
				initialDelay: 2000, // Start with 2 seconds for rate limits
			},
		).catch((error) => {
			if (error instanceof APIError && error.isClientError()) {
				// Don't retry client errors (401, 403, etc.)
				return null;
			}
			throw error;
		});
	}

	async getCurrentTrack(accessToken: string): Promise<any> {
		return retryWithBackoff(
			async () => {
				try {
					const response = await axios.get(
						`${SPOTIFY_API_URL}/me/player/currently-playing`,
						{
							headers: { Authorization: `Bearer ${accessToken}` },
						},
					);
					return response.data;
				} catch (error) {
					const axiosError = error as AxiosError;
					const statusCode = axiosError.response?.status;

					// Don't retry client errors (401, 403, 404)
					if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
						return null;
					}

					const isRetryable = statusCode !== undefined && (statusCode >= 500 || statusCode === 429);
					throw new APIError(
						`Failed to get current Spotify track: ${axiosError.message}`,
						"Spotify",
						statusCode,
						isRetryable,
						{ endpoint: "/me/player/currently-playing" },
					);
				}
			},
			{
				maxRetries: 2,
				retryable: (error) => {
					return error instanceof APIError && error.retryable;
				},
			},
		).catch(() => {
			// Return null on any error (including retry exhaustion)
			return null;
		});
	}

	async getPlaylists(accessToken: string): Promise<any[]> {
		return retryWithBackoff(
			async () => {
				try {
					const response = await axios.get(`${SPOTIFY_API_URL}/me/playlists`, {
						headers: { Authorization: `Bearer ${accessToken}` },
					});
					return response.data.items || [];
				} catch (error) {
					const axiosError = error as AxiosError;
					const statusCode = axiosError.response?.status;
					const isRetryable = statusCode !== undefined && (statusCode >= 500 || statusCode === 429);

					throw new APIError(
						`Failed to get Spotify playlists: ${axiosError.message}`,
						"Spotify",
						statusCode,
						isRetryable,
						{ endpoint: "/me/playlists" },
					);
				}
			},
			{ maxRetries: 2 },
		).catch(() => []);
	}

	async getPlaylistTracks(
		accessToken: string,
		playlistId: string,
	): Promise<any[]> {
		return retryWithBackoff(
			async () => {
				try {
					const response = await axios.get(
						`${SPOTIFY_API_URL}/playlists/${playlistId}/tracks`,
						{
							headers: { Authorization: `Bearer ${accessToken}` },
						},
					);
					return response.data.items || [];
				} catch (error) {
					const axiosError = error as AxiosError;
					const statusCode = axiosError.response?.status;
					const isRetryable = statusCode !== undefined && (statusCode >= 500 || statusCode === 429);

					throw new APIError(
						`Failed to get playlist tracks: ${axiosError.message}`,
						"Spotify",
						statusCode,
						isRetryable,
						{ endpoint: `/playlists/${playlistId}/tracks` },
					);
				}
			},
			{ maxRetries: 2 },
		).catch(() => []);
	}

	async saveUser(
		userId: string,
		spotifyId: string,
		accessToken: string,
		refreshToken: string,
		expiresIn: number,
		displayName: string,
		profileImage?: string,
	): Promise<void> {
		try {
			const expiresAt = new Date(Date.now() + expiresIn * 1000);
			await SpotifyUser.findOneAndUpdate(
				{ userId },
				{
					spotifyId,
					accessToken,
					refreshToken,
					expiresAt,
					displayName,
					profileImage,
				},
				{ upsert: true, new: true },
			);
		} catch (error) {
			throw new DatabaseError(
				`Failed to save Spotify user: ${error instanceof Error ? error.message : String(error)}`,
				"saveUser",
				true,
				{ userId, spotifyId },
			);
		}
	}

	async getUser(userId: string): Promise<any> {
		try {
			return await SpotifyUser.findOne({ userId });
		} catch (error) {
			throw new DatabaseError(
				`Failed to get Spotify user: ${error instanceof Error ? error.message : String(error)}`,
				"getUser",
				true,
				{ userId },
			);
		}
	}

	async refreshToken(userId: string): Promise<string | null> {
		return retryWithBackoff(
			async () => {
				try {
					const user = await SpotifyUser.findOne({ userId });
					if (!user || !user.refreshToken) return null;

					const response = await axios.post(SPOTIFY_AUTH_URL, null, {
						params: {
							grant_type: "refresh_token",
							refresh_token: user.refreshToken,
							client_id: this.clientId,
							client_secret: this.clientSecret,
						},
					});

					const newAccessToken = response.data.access_token;
					const expiresAt = new Date(Date.now() + response.data.expires_in * 1000);

					await SpotifyUser.findOneAndUpdate(
						{ userId },
						{
							accessToken: newAccessToken,
							expiresAt,
						},
					);

					return newAccessToken;
				} catch (error) {
					const axiosError = error as AxiosError;
					const statusCode = axiosError.response?.status;
					const isRetryable = statusCode !== undefined && (statusCode >= 500 || statusCode === 429);

					throw new APIError(
						`Failed to refresh Spotify token: ${axiosError.message}`,
						"Spotify",
						statusCode,
						isRetryable,
						{ userId, operation: "refreshToken" },
					);
				}
			},
			{
				maxRetries: 2,
			},
		).catch(() => {
			// Return null on error (token refresh failed)
			return null;
		});
	}

	async getTopTracks(accessToken: string, limit = 10): Promise<any[]> {
		return retryWithBackoff(
			async () => {
				try {
					const response = await axios.get(
						`${SPOTIFY_API_URL}/me/top/tracks?limit=${limit}&time_range=medium_term`,
						{
							headers: { Authorization: `Bearer ${accessToken}` },
						},
					);
					return response.data.items || [];
				} catch (error) {
					const axiosError = error as AxiosError;
					const statusCode = axiosError.response?.status;
					const isRetryable = statusCode !== undefined && (statusCode >= 500 || statusCode === 429);

					throw new APIError(
						`Failed to get top tracks: ${axiosError.message}`,
						"Spotify",
						statusCode,
						isRetryable,
						{ endpoint: "/me/top/tracks" },
					);
				}
			},
			{ maxRetries: 2 },
		).catch(() => []);
	}

	async getTopArtists(accessToken: string, limit = 10): Promise<any[]> {
		return retryWithBackoff(
			async () => {
				try {
					const response = await axios.get(
						`${SPOTIFY_API_URL}/me/top/artists?limit=${limit}&time_range=medium_term`,
						{
							headers: { Authorization: `Bearer ${accessToken}` },
						},
					);
					return response.data.items || [];
				} catch (error) {
					const axiosError = error as AxiosError;
					const statusCode = axiosError.response?.status;
					const isRetryable = statusCode !== undefined && (statusCode >= 500 || statusCode === 429);

					throw new APIError(
						`Failed to get top artists: ${axiosError.message}`,
						"Spotify",
						statusCode,
						isRetryable,
						{ endpoint: "/me/top/artists" },
					);
				}
			},
			{ maxRetries: 2 },
		).catch(() => []);
	}

	async getRecommendations(accessToken: string, seedArtists: string[]): Promise<any[]> {
		return retryWithBackoff(
			async () => {
				try {
					const response = await axios.get(
						`${SPOTIFY_API_URL}/recommendations?seed_artists=${seedArtists.join(",")}&limit=20`,
						{
							headers: { Authorization: `Bearer ${accessToken}` },
						},
					);
					return response.data.tracks || [];
				} catch (error) {
					const axiosError = error as AxiosError;
					const statusCode = axiosError.response?.status;
					const isRetryable = statusCode !== undefined && (statusCode >= 500 || statusCode === 429);

					throw new APIError(
						`Failed to get recommendations: ${axiosError.message}`,
						"Spotify",
						statusCode,
						isRetryable,
						{ endpoint: "/recommendations" },
					);
				}
			},
			{ maxRetries: 2 },
		).catch(() => []);
	}

	async getAllUsers(): Promise<any[]> {
		try {
			return await SpotifyUser.find({});
		} catch (error) {
			throw new DatabaseError(
				`Failed to get all Spotify users: ${error instanceof Error ? error.message : String(error)}`,
				"getAllUsers",
				true,
			);
		}
	}
}

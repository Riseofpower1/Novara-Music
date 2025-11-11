import axios from "axios";
import { SpotifyUser } from "../database/models";

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
		try {
			const response = await axios.get(`${SPOTIFY_API_URL}/me`, {
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			return response.data;
		} catch (error) {
			console.error("Error getting Spotify profile:", error);
			return null;
		}
	}

	async getCurrentTrack(accessToken: string): Promise<any> {
		try {
			const response = await axios.get(
				`${SPOTIFY_API_URL}/me/player/currently-playing`,
				{
					headers: { Authorization: `Bearer ${accessToken}` },
				}
			);
			return response.data;
		} catch (error: any) {
			// Handle 403 Forbidden - token may be expired or user not authorized
			if (error.response?.status === 403) {
				console.error("Spotify 403 Forbidden: User may not be registered in app or token is invalid");
				console.error("Response data:", error.response?.data);
				return null;
			}
			// Handle 401 Unauthorized - token is expired
			if (error.response?.status === 401) {
				console.error("Spotify 401 Unauthorized: Token expired or invalid");
				return null;
			}
			console.error("Error getting current Spotify track:", error.message);
			return null;
		}
	}

	async getPlaylists(accessToken: string): Promise<any[]> {
		try {
			const response = await axios.get(`${SPOTIFY_API_URL}/me/playlists`, {
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			return response.data.items || [];
		} catch (error) {
			console.error("Error getting Spotify playlists:", error);
			return [];
		}
	}

	async getPlaylistTracks(
		accessToken: string,
		playlistId: string
	): Promise<any[]> {
		try {
			const response = await axios.get(
				`${SPOTIFY_API_URL}/playlists/${playlistId}/tracks`,
				{
					headers: { Authorization: `Bearer ${accessToken}` },
				}
			);
			return response.data.items || [];
		} catch (error) {
			console.error("Error getting playlist tracks:", error);
			return [];
		}
	}

	async saveUser(
		userId: string,
		spotifyId: string,
		accessToken: string,
		refreshToken: string,
		expiresIn: number,
		displayName: string,
		profileImage?: string
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
				{ upsert: true, new: true }
			);
		} catch (error) {
			console.error("Error saving Spotify user:", error);
		}
	}

	async getUser(userId: string): Promise<any> {
		try {
			return await SpotifyUser.findOne({ userId });
		} catch (error) {
			console.error("Error getting Spotify user:", error);
			return null;
		}
	}

	async refreshToken(userId: string): Promise<string | null> {
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
				}
			);

			return newAccessToken;
		} catch (error) {
			console.error("Error refreshing Spotify token:", error);
			return null;
		}
	}

	async getTopTracks(accessToken: string, limit = 10): Promise<any[]> {
		try {
			const response = await axios.get(
				`${SPOTIFY_API_URL}/me/top/tracks?limit=${limit}&time_range=medium_term`,
				{
					headers: { Authorization: `Bearer ${accessToken}` },
				}
			);
			return response.data.items || [];
		} catch (error) {
			console.error("Error getting top tracks:", error);
			return [];
		}
	}

	async getTopArtists(accessToken: string, limit = 10): Promise<any[]> {
		try {
			const response = await axios.get(
				`${SPOTIFY_API_URL}/me/top/artists?limit=${limit}&time_range=medium_term`,
				{
					headers: { Authorization: `Bearer ${accessToken}` },
				}
			);
			return response.data.items || [];
		} catch (error) {
			console.error("Error getting top artists:", error);
			return [];
		}
	}

	async getRecommendations(accessToken: string, seedArtists: string[]): Promise<any[]> {
		try {
			const response = await axios.get(
				`${SPOTIFY_API_URL}/recommendations?seed_artists=${seedArtists.join(",")}&limit=20`,
				{
					headers: { Authorization: `Bearer ${accessToken}` },
				}
			);
			return response.data.tracks || [];
		} catch (error) {
			console.error("Error getting recommendations:", error);
			return [];
		}
	}

	async getAllUsers(): Promise<any[]> {
		try {
			return await SpotifyUser.find({});
		} catch (error) {
			console.error("Error getting all Spotify users:", error);
			return [];
		}
	}
}

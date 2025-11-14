import axios from "axios";
import { SpotifyUser } from "../database/models";
import { env } from "../env";
import Logger from "../structures/Logger";
import { APIError } from "../utils/errors";

const logger = new Logger();

export class SpotifyOAuthService {
	private clientId: string;
	private clientSecret: string;
	private redirectUri: string;

	constructor() {
		this.clientId = env.SPOTIFY_CLIENT_ID || "";
		this.clientSecret = env.SPOTIFY_CLIENT_SECRET || "";
		this.redirectUri = env.SPOTIFY_REDIRECT_URI || "";
	}

	/**
	 * Generate authorization URL for user to visit
	 */
	generateAuthUrl(userId: string): string {
		const scopes = [
			"user-read-private",
			"user-read-email",
			"user-library-read",
			"user-top-read",
			"user-read-currently-playing",
		];

		const params = new URLSearchParams({
			client_id: this.clientId,
			response_type: "code",
			redirect_uri: this.redirectUri,
			scope: scopes.join(" "),
			state: userId,
		});

		return `https://accounts.spotify.com/authorize?${params.toString()}`;
	}

	/**
	 * Exchange authorization code for access token
	 */
	async exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
		try {
			// Validate code isn't empty
			if (!code || code.length < 10) {
				throw new Error("Invalid authorization code format");
			}

			logger.debug("[Spotify OAuth] Exchanging code for token...");
			logger.debug(
				`[Spotify OAuth] Client ID: ${this.clientId.substring(0, 8)}...`,
			);
			logger.debug(`[Spotify OAuth] Redirect URI: ${this.redirectUri}`);

			const response = await axios.post(
				"https://accounts.spotify.com/api/token",
				new URLSearchParams({
					code,
					redirect_uri: this.redirectUri,
					grant_type: "authorization_code",
				}).toString(),
				{
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
						Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
					},
					timeout: 10000,
				}
			);

			if (!response.data.access_token) {
				throw new Error("No access token in response");
			}

			logger.success("[Spotify OAuth] Token exchange successful");
			return {
				accessToken: response.data.access_token,
				refreshToken: response.data.refresh_token || "",
				expiresIn: response.data.expires_in || 3600,
			};
		} catch (error: unknown) {
			const axiosError = error as { response?: { data?: { error?: string; error_description?: string } }; message?: string };
			const errorMsg = axiosError.response?.data?.error || axiosError.message || "Unknown error";
			const errorDescription = axiosError.response?.data?.error_description || "";
			logger.error(
				`[Spotify OAuth] Token exchange failed: ${errorMsg}${errorDescription ? ` - ${errorDescription}` : ""}`,
			);
			throw new APIError(
				`Spotify token exchange failed: ${errorMsg}`,
				"Spotify",
				axiosError.response ? 400 : undefined,
				false,
				{ errorDescription },
			);
		}
	}

	/**
	 * Get user profile from Spotify
	 */
	async getUserProfile(accessToken: string): Promise<{ id: string; display_name: string; images?: any[] }> {
		try {
			const response = await axios.get("https://api.spotify.com/v1/me", {
				headers: { Authorization: `Bearer ${accessToken}` },
				timeout: 10000,
			});

			return {
				id: response.data.id,
				display_name: response.data.display_name || "Unknown",
				images: response.data.images,
			};
		} catch (error: any) {
			if (error.response?.status === 403) {
				throw new Error("User not authorized in Spotify app (may be in development mode with user limit)");
			}
			if (error.response?.status === 401) {
				throw new Error("Access token expired or invalid");
			}
			throw new Error(`Failed to fetch profile: ${error.message}`);
		}
	}

	/**
	 * Save/update Spotify user in database
	 */
	async saveUser(
		discordUserId: string,
		spotifyId: string,
		accessToken: string,
		refreshToken: string,
		expiresIn: number,
		displayName: string,
		profileImage?: string
	): Promise<void> {
		const expiresAt = new Date(Date.now() + expiresIn * 1000);

		await SpotifyUser.updateOne(
			{ userId: discordUserId },
			{
				userId: discordUserId,
				spotifyId,
				accessToken,
				refreshToken,
				expiresAt,
				displayName,
				profileImage,
				linkedAt: new Date(),
			},
			{ upsert: true }
		);
	}

	/**
	 * Complete OAuth flow: exchange code and save user
	 */
	async completeOAuthFlow(code: string, userId: string): Promise<{ displayName: string; spotifyId: string }> {
		// Exchange code for tokens
		const { accessToken, refreshToken, expiresIn } = await this.exchangeCode(code);

		// Get user profile
		const profile = await this.getUserProfile(accessToken);

		// Save to database
		await this.saveUser(
			userId,
			profile.id,
			accessToken,
			refreshToken,
			expiresIn,
			profile.display_name,
			profile.images?.[0]?.url
		);

		return {
			displayName: profile.display_name,
			spotifyId: profile.id,
		};
	}
}

export const spotifyOAuth = new SpotifyOAuthService();

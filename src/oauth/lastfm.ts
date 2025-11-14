import axios from "axios";
import { LastfmUser } from "../database/models";
import { env } from "../env";
import crypto from "crypto";
import Logger from "../structures/Logger";
import { APIError } from "../utils/errors";

const logger = new Logger();

const LASTFM_API_URL = "http://ws.audioscrobbler.com/2.0";

export class LastfmOAuthService {
	private apiKey: string;
	private apiSecret: string;
	private redirectUri: string;

	constructor() {
		this.apiKey = env.LASTFM_API_KEY || "";
		this.apiSecret = env.LASTFM_API_SECRET || "";
		this.redirectUri = env.LASTFM_REDIRECT_URI || "https://novara.cloud-ip.cc:3000/auth/lastfm/callback";
	}

	/**
	 * Generate Last.fm authorization URL
	 */
	generateAuthUrl(token: string): string {
		return `https://www.last.fm/api/auth/?api_key=${this.apiKey}&token=${token}&cb=${encodeURIComponent(this.redirectUri)}`;
	}

	/**
	 * Create MD5 hash for Last.fm API signature
	 */
	private createSignature(params: Record<string, string>): string {
		const sortedKeys = Object.keys(params).sort();
		let baseString = "";

		for (const key of sortedKeys) {
			baseString += key + params[key];
		}

		baseString += this.apiSecret;
		return crypto.createHash("md5").update(baseString).digest("hex");
	}

	/**
	 * Get session key from Last.fm using token
	 */
	async getSessionKey(token: string): Promise<string> {
		try {
			// Create method signature
			const params: Record<string, string> = {
				method: "auth.getSession",
				api_key: this.apiKey,
				token,
			};

			const apiSig = this.createSignature(params);

			const response = await axios.post(LASTFM_API_URL, null, {
				params: {
					...params,
					api_sig: apiSig,
					format: "json",
				},
			});

			if (response.data.session?.key) {
				return response.data.session.key;
			}

				logger.error("[Last.fm OAuth] No session key in response:", response.data);
				throw new APIError(
					"Failed to get session key from Last.fm",
					"Last.fm",
					undefined,
					true,
				);
			} catch (error) {
				logger.error("[Last.fm OAuth] Error getting session key:", error);
				if (axios.isAxiosError(error) && error.response?.data) {
					logger.error("[Last.fm OAuth] Last.fm error:", error.response.data);
				}
				throw new APIError(
					`Failed to get Last.fm session key: ${error instanceof Error ? error.message : String(error)}`,
					"Last.fm",
					axios.isAxiosError(error) ? error.response?.status : undefined,
					true,
				);
			}
	}

	/**
	 * Get Last.fm user info
	 */
	async getUserInfo(sessionKey: string): Promise<any> {
		try {
			const params = {
				method: "user.getInfo",
				sk: sessionKey,
				api_key: this.apiKey,
				format: "json",
			};

			const response = await axios.get(LASTFM_API_URL, { params });

			if (response.data.user) {
				return response.data.user;
			}

			logger.error("[Last.fm OAuth] No user info in response:", response.data);
			throw new APIError(
				"Failed to get user info from Last.fm",
				"Last.fm",
				undefined,
				true,
			);
		} catch (error) {
			logger.error("[Last.fm OAuth] Error getting user info:", error);
			throw new APIError(
				`Failed to get Last.fm user info: ${error instanceof Error ? error.message : String(error)}`,
				"Last.fm",
				axios.isAxiosError(error) ? error.response?.status : undefined,
				true,
			);
		}
	}

	/**
	 * Save Last.fm user to database
	 */
	async saveUser(userId: string, sessionKey: string, username: string): Promise<void> {
		try {
			await LastfmUser.findOneAndUpdate(
				{ userId },
				{
					lastfmUsername: username,
					sessionKey,
					scrobbleEnabled: true,
					linkedAt: new Date(),
				},
				{ upsert: true, new: true }
			);

			logger.info(`[Last.fm OAuth] User ${userId} linked to ${username}`);
		} catch (error) {
			logger.error("[Last.fm OAuth] Error saving user:", error);
			throw error;
		}
	}

	/**
	 * Complete Last.fm OAuth flow
	 */
	async completeOAuthFlow(token: string, userId: string): Promise<{ username: string; sessionKey: string }> {
		try {
			logger.debug("[Last.fm OAuth] Exchanging token for session key...");

			// Get session key from token
			const sessionKey = await this.getSessionKey(token);

			if (!sessionKey) {
				throw new APIError(
					"Failed to obtain session key",
					"Last.fm",
					undefined,
					false,
				);
			}

			logger.debug("[Last.fm OAuth] Got session key, fetching user info...");

			// Get user info
			const userInfo = await this.getUserInfo(sessionKey);

			const username = userInfo.name || userInfo.realname || "Unknown";

			// Save to database
			await this.saveUser(userId, sessionKey, username);

			return { username, sessionKey };
		} catch (error) {
			logger.error("[Last.fm OAuth] Error in OAuth flow:", error);
			throw error;
		}
	}
}

export const lastfmOAuth = new LastfmOAuthService();

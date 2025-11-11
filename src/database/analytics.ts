import {
	UserStats,
	GuildStats,
	Track,
	Achievement,
	ActivityLog,
	CommunityPlaylist,
	UserIdentity,
} from "./models";

export interface IAnalyticsService {
	trackPlay(
		userId: string,
		guildId: string,
		track: string,
		artist: string,
		duration: number,
		genre?: string
	): Promise<void>;
	getUserStats(userId: string): Promise<any>;
	getGuildStats(guildId: string): Promise<any>;
	getTopTracks(guildId: string, limit?: number): Promise<any[]>;
	getTopArtists(guildId: string, limit?: number): Promise<any[]>;
	getTopGenres(guildId: string, limit?: number): Promise<any[]>;
	getLeaderboard(guildId: string, type: string): Promise<any[]>;
	addAchievement(
		userId: string,
		guildId: string,
		achievementId: string,
		name: string,
		description: string,
		icon?: string
	): Promise<void>;
	getAchievements(userId: string, guildId: string): Promise<any>;
	generateRecommendations(
		userId: string,
		guildId: string,
		queue: any[]
	): Promise<any[]>;
	// New methods for advanced features
	getLeaderboardByMetric(guildId: string, metric: 'hours' | 'artists' | 'genres'): Promise<any[]>;
	compareUserStats(userId1: string, userId2: string): Promise<any>;
	logActivity(guildId: string, userId: string, eventType: string, data: any): Promise<void>;
	getActivityFeed(guildId: string, limit?: number): Promise<any[]>;
	createCommunityPlaylist(guildId: string, name: string, createdBy: string, description?: string): Promise<any>;
	addTrackToPlaylist(playlistId: string, track: string, artist: string, addedBy: string): Promise<void>;
	getCommunityPlaylists(guildId: string): Promise<any[]>;
	// User identity linking
	linkUserIdentity(discordId: string, dashboardUserId: string, username?: string, avatar?: string): Promise<void>;
	getUserIdentity(discordId: string): Promise<any>;
	getOrCreateUserIdentity(discordId: string, dashboardUserId: string): Promise<any>;
	// Spotify tracking
	trackSpotifyPlay(userId: string, guildId: string, track: string, artist: string, album: string, durationMs: number): Promise<void>;
}

export class AnalyticsService implements IAnalyticsService {
	async trackPlay(
		userId: string,
		guildId: string,
		track: string,
		artist: string,
		duration: number,
		genre?: string
	): Promise<void> {
		try {
			console.log(`[Analytics] Tracking play: ${userId} - ${track} by ${artist}`);
			
			// Update user stats
			const userStats = await UserStats.findOneAndUpdate(
				{ userId },
				{
					$inc: {
						totalTracksPlayed: 1,
						totalTimeListened: duration,
					},
					$set: { lastListenedAt: new Date() },
				},
				{ upsert: true, new: true }
			);
			console.log(`[Analytics] Updated user stats. Total tracks: ${userStats?.totalTracksPlayed}`);

			// Update guild stats
			await GuildStats.findOneAndUpdate(
				{ guildId },
				{
					$inc: { totalTracksPlayed: 1 },
				},
				{ upsert: true, new: true }
			);

			// Update track analytics
			await Track.findOneAndUpdate(
				{ trackId: `${artist}-${track}` },
				{
					$inc: { timesPlayed: 1 },
					$set: { title: track, artist, genre, duration },
				},
				{ upsert: true, new: true }
			);

			// Update peak hours
			const hour = new Date().getHours();
			await GuildStats.updateOne(
				{ guildId, "peakHours.hour": hour },
				{ $inc: { "peakHours.$.plays": 1 } }
			);

			// Log activity
			await this.logActivity(guildId, userId, 'track_play', { track, artist });
			
			// Check and unlock achievements
			if (userStats) {
				const totalTracks = (userStats.totalTracksPlayed || 0) + 1;
				const totalTimeMs = (userStats.totalTimeListened || 0) + duration;
				const totalTimeHours = totalTimeMs / (1000 * 60 * 60);
				
				console.log(`[Analytics] Checking achievements for ${userId}: ${totalTracks} tracks, ${totalTimeHours.toFixed(2)} hours`);
				
				// First song achievement
				if (totalTracks === 1) {
					console.log(`[Analytics] Unlocking first_song for ${userId}`);
					await this.addAchievement(userId, guildId, 'first_song', 'First Song', 'Play your first song', '🎵');
					await this.logActivity(guildId, userId, 'achievement_unlock', { achievement: 'first_song' });
				}
				// 10 songs achievement
				if (totalTracks === 10) {
					console.log(`[Analytics] Unlocking ten_songs for ${userId}`);
					await this.addAchievement(userId, guildId, 'ten_songs', 'Starter', 'Play 10 songs', '🎶');
					await this.logActivity(guildId, userId, 'achievement_unlock', { achievement: 'ten_songs' });
				}
				// 100 songs achievement
				if (totalTracks === 100) {
					console.log(`[Analytics] Unlocking hundred_songs for ${userId}`);
					await this.addAchievement(userId, guildId, 'hundred_songs', 'Collector', 'Play 100 songs', '💿');
					await this.logActivity(guildId, userId, 'achievement_unlock', { achievement: 'hundred_songs' });
				}
				// 1000 songs achievement
				if (totalTracks === 1000) {
					console.log(`[Analytics] Unlocking thousand_songs for ${userId}`);
					await this.addAchievement(userId, guildId, 'thousand_songs', 'Master', 'Play 1000 songs', '👑');
					await this.logActivity(guildId, userId, 'achievement_unlock', { achievement: 'thousand_songs' });
				}
				// 1 hour listening achievement
				if (totalTimeHours >= 1 && (userStats.totalTimeListened || 0) < 1000 * 60 * 60) {
					console.log(`[Analytics] Unlocking hour_listening for ${userId}`);
					await this.addAchievement(userId, guildId, 'hour_listening', 'Hour Listener', 'Listen for 1 hour', '⏰');
					await this.logActivity(guildId, userId, 'milestone', { description: 'Reached 1 hour of listening' });
				}
				// 24 hour listening achievement
				if (totalTimeHours >= 24 && (userStats.totalTimeListened || 0) < 24 * 1000 * 60 * 60) {
					console.log(`[Analytics] Unlocking day_listening for ${userId}`);
					await this.addAchievement(userId, guildId, 'day_listening', 'Day Listener', 'Listen for 24 hours', '📅');
					await this.logActivity(guildId, userId, 'milestone', { description: 'Reached 24 hours of listening' });
				}
			}
		} catch (error) {
			console.error("Error tracking play:", error);
		}
	}

	async getUserStats(userId: string): Promise<any> {
		try {
			return await UserStats.findOne({ userId });
		} catch (error) {
			console.error("Error getting user stats:", error);
			return null;
		}
	}

	async getGuildStats(guildId: string): Promise<any> {
		try {
			return await GuildStats.findOne({ guildId });
		} catch (error) {
			console.error("Error getting guild stats:", error);
			return null;
		}
	}

	async getTopTracks(guildId: string, limit = 10): Promise<any[]> {
		try {
			const stats = await GuildStats.findOne({ guildId });
			return stats?.topTracks.slice(0, limit) || [];
		} catch (error) {
			console.error("Error getting top tracks:", error);
			return [];
		}
	}

	async getTopArtists(guildId: string, limit = 10): Promise<any[]> {
		try {
			const stats = await GuildStats.findOne({ guildId });
			return stats?.topArtists.slice(0, limit) || [];
		} catch (error) {
			console.error("Error getting top artists:", error);
			return [];
		}
	}

	async getTopGenres(guildId: string, limit = 10): Promise<any[]> {
		try {
			const stats = await GuildStats.findOne({ guildId });
			return stats?.topGenres.slice(0, limit) || [];
		} catch (error) {
			console.error("Error getting top genres:", error);
			return [];
		}
	}

	async getLeaderboard(_guildId: string, type: string): Promise<any[]> {
		try {
			if (type === "listeners") {
				const stats = await UserStats.find({ totalTracksPlayed: { $gt: 0 } })
					.sort({ totalTracksPlayed: -1 })
					.limit(50)
					.select('userId totalTracksPlayed totalTimeListened');
				
				// Fetch usernames from UserIdentity
				const result = await Promise.all(stats.map(async (stat) => {
					const userIdentity = await UserIdentity.findOne({ discordId: stat.userId });
					return {
						userId: stat.userId,
						name: userIdentity?.username || stat.userId,
						count: stat.totalTracksPlayed || 0
					};
				}));
				
				return result;
			}
			if (type === "artists") {
				const stats = await UserStats.find({ 'favoriteArtists.0': { $exists: true } })
					.sort({ 'favoriteArtists.0.count': -1 })
					.limit(50)
					.select('userId favoriteArtists');
				return stats.map(stat => ({
					userId: stat.userId,
					name: stat.favoriteArtists?.[0]?.artist || 'Unknown Artist',
					count: stat.favoriteArtists?.[0]?.count || 0
				}));
			}
			if (type === "tracks") {
				const stats = await UserStats.find({ 'topTracks.0': { $exists: true } })
					.sort({ 'topTracks.0.count': -1 })
					.limit(50)
					.select('userId topTracks');
				return stats.map(stat => ({
					userId: stat.userId,
					name: stat.topTracks?.[0]?.track || 'Unknown Track',
					count: stat.topTracks?.[0]?.count || 0
				}));
			}
			return [];
		} catch (error) {
			console.error("Error getting leaderboard:", error);
			return [];
		}
	}

	async addAchievement(
		userId: string,
		guildId: string,
		achievementId: string,
		name: string,
		description: string,
		icon?: string
	): Promise<void> {
		try {
			console.log(`[Analytics] Adding achievement ${achievementId} for user ${userId} in guild ${guildId}`);
			
			// Check if achievement already unlocked
			const existing = await Achievement.findOne({ userId, guildId });
			const alreadyUnlocked = existing?.achievements?.some((a: any) => a.id === achievementId);
			
			if (alreadyUnlocked) {
				console.log(`[Analytics] Achievement ${achievementId} already unlocked for ${userId}, skipping`);
				return; // Don't add duplicate
			}
			
			const result = await Achievement.findOneAndUpdate(
				{ userId, guildId },
				{
					$push: {
						achievements: {
							id: achievementId,
							name,
							description,
							icon,
							unlockedAt: new Date(),
						},
					},
				},
				{ upsert: true, new: true }
			);
			
			console.log(`[Analytics] Achievement ${achievementId} added successfully for ${userId}. Total achievements: ${result?.achievements?.length}`);
		} catch (error) {
			console.error("Error adding achievement:", error);
		}
	}

	async getAchievements(userId: string, guildId: string): Promise<any> {
		try {
			return await Achievement.findOne({ userId, guildId });
		} catch (error) {
			console.error("Error getting achievements:", error);
			return null;
		}
	}

	async generateRecommendations(
		userId: string,
		_guildId: string,
		queue: any[]
	): Promise<any[]> {
		try {
			const userStats = await UserStats.findOne({ userId });
			if (!userStats || !userStats.topArtists || !Array.isArray(userStats.topArtists) || userStats.topArtists.length === 0) {
				return [];
			}

			// Simple recommendation based on top artists
			const topArtists = userStats.topArtists.slice(0, 3).map((a: any) => a.artist);
			const recommendations = await Track.find({
				artist: { $in: topArtists },
				trackId: { $nin: queue.map((t) => `${t.artist}-${t.title}`) },
			})
				.sort({ timesPlayed: -1 })
				.limit(5);

			return recommendations;
		} catch (error) {
			console.error("Error generating recommendations:", error);
			return [];
		}
	}

	async getLeaderboardByMetric(_guildId: string, metric: 'hours' | 'artists' | 'genres'): Promise<any[]> {
		try {
			if (metric === 'hours') {
				const stats = await UserStats.find({ totalTimeListened: { $gt: 0 } })
					.sort({ totalTimeListened: -1 })
					.limit(50)
					.select('userId totalTimeListened');
				return stats.map(stat => ({
					userId: stat.userId,
					name: stat.userId,
					count: Math.round((stat.totalTimeListened || 0) / (1000 * 60 * 60) * 10) / 10, // Convert to hours
					unit: 'hours'
				}));
			}
			if (metric === 'artists') {
				const stats = await UserStats.find({ 'favoriteArtists.0': { $exists: true } })
					.sort({ 'favoriteArtists': -1 })
					.limit(50);
				return stats
					.map(stat => ({
						userId: stat.userId,
						name: stat.userId,
						count: (stat.favoriteArtists || []).length,
						unit: 'unique artists'
					}))
					.sort((a, b) => (b.count || 0) - (a.count || 0));
			}
			if (metric === 'genres') {
				const stats = await UserStats.find({ 'favoriteGenres.0': { $exists: true } })
					.sort({ 'favoriteGenres': -1 })
					.limit(50);
				return stats
					.map(stat => ({
						userId: stat.userId,
						name: stat.userId,
						count: (stat.favoriteGenres || []).length,
						unit: 'unique genres'
					}))
					.sort((a, b) => (b.count || 0) - (a.count || 0));
			}
			return [];
		} catch (error) {
			console.error("Error getting leaderboard by metric:", error);
			return [];
		}
	}

	async compareUserStats(userId1: string, userId2: string): Promise<any> {
		try {
			const stats1 = await UserStats.findOne({ userId: userId1 });
			const stats2 = await UserStats.findOne({ userId: userId2 });
			const achievements1 = await Achievement.findOne({ userId: userId1 });
			const achievements2 = await Achievement.findOne({ userId: userId2 });

			return {
				user1: {
					userId: userId1,
					stats: stats1,
					achievements: achievements1?.achievements || [],
				},
				user2: {
					userId: userId2,
					stats: stats2,
					achievements: achievements2?.achievements || [],
				},
				comparison: {
					tracksPlayed: {
						user1: stats1?.totalTracksPlayed || 0,
						user2: stats2?.totalTracksPlayed || 0,
						winner: (stats1?.totalTracksPlayed || 0) > (stats2?.totalTracksPlayed || 0) ? userId1 : userId2,
					},
					hoursListened: {
						user1: Math.round((stats1?.totalTimeListened || 0) / (1000 * 60 * 60) * 10) / 10,
						user2: Math.round((stats2?.totalTimeListened || 0) / (1000 * 60 * 60) * 10) / 10,
						winner: (stats1?.totalTimeListened || 0) > (stats2?.totalTimeListened || 0) ? userId1 : userId2,
					},
					achievements: {
						user1: achievements1?.achievements?.length || 0,
						user2: achievements2?.achievements?.length || 0,
						winner: (achievements1?.achievements?.length || 0) > (achievements2?.achievements?.length || 0) ? userId1 : userId2,
					},
				},
			};
		} catch (error) {
			console.error("Error comparing user stats:", error);
			return null;
		}
	}

	async logActivity(guildId: string, userId: string, eventType: string, data: any): Promise<void> {
		try {
			await ActivityLog.create({
				guildId,
				userId,
				eventType,
				track: data.track,
				artist: data.artist,
				achievement: data.achievement,
				description: data.description,
			});
		} catch (error) {
			console.error("Error logging activity:", error);
		}
	}

	async getActivityFeed(guildId: string, limit = 50): Promise<any[]> {
		try {
			const activities = await ActivityLog.find({ guildId })
				.sort({ timestamp: -1 })
				.limit(limit);
			return activities;
		} catch (error) {
			console.error("Error getting activity feed:", error);
			return [];
		}
	}

	async createCommunityPlaylist(guildId: string, name: string, createdBy: string, description?: string): Promise<any> {
		try {
			const playlist = await CommunityPlaylist.create({
				guildId,
				name,
				createdBy,
				description,
				tracks: [],
				followers: [createdBy],
			});
			return playlist;
		} catch (error) {
			console.error("Error creating community playlist:", error);
			return null;
		}
	}

	async addTrackToPlaylist(playlistId: string, track: string, artist: string, addedBy: string): Promise<void> {
		try {
			await CommunityPlaylist.findByIdAndUpdate(
				playlistId,
				{
					$push: {
						tracks: {
							track,
							artist,
							addedBy,
						},
					},
				},
				{ new: true }
			);
		} catch (error) {
			console.error("Error adding track to playlist:", error);
		}
	}

	async getCommunityPlaylists(guildId: string): Promise<any[]> {
		try {
			const playlists = await CommunityPlaylist.find({ guildId, isPublic: true })
				.sort({ createdAt: -1 });
			return playlists;
		} catch (error) {
			console.error("Error getting community playlists:", error);
			return [];
		}
	}

	// User Identity Linking Methods
	async linkUserIdentity(discordId: string, dashboardUserId: string, username?: string, avatar?: string): Promise<void> {
		try {
			await UserIdentity.findOneAndUpdate(
				{ discordId },
				{
					dashboardUserId,
					username,
					avatar,
					linkedAt: new Date(),
				},
				{ upsert: true, new: true }
			);
			console.log(`[Analytics] Linked Discord ID ${discordId} to Dashboard user ${dashboardUserId}`);
		} catch (error) {
			console.error("Error linking user identity:", error);
		}
	}

	async getUserIdentity(discordId: string): Promise<any> {
		try {
			const identity = await UserIdentity.findOne({ discordId });
			return identity;
		} catch (error) {
			console.error("Error getting user identity:", error);
			return null;
		}
	}

	async getOrCreateUserIdentity(discordId: string, dashboardUserId: string): Promise<any> {
		try {
			const existing = await UserIdentity.findOne({ discordId });
			if (existing) {
				return existing;
			}
			return await UserIdentity.create({
				discordId,
				dashboardUserId,
				linkedAt: new Date(),
			});
		} catch (error) {
			console.error("Error creating or getting user identity:", error);
			return null;
		}
	}

	async trackSpotifyPlay(userId: string, guildId: string, track: string, artist: string, album: string, durationMs: number): Promise<void> {
		try {
			console.log(`[Analytics] Tracking Spotify play: ${userId} - ${track} by ${artist}`);
			
			// Update user stats
			await UserStats.findOneAndUpdate(
				{ userId },
				{
					$inc: {
						totalTracksPlayed: 1,
						totalTimeListened: durationMs,
					},
					$set: { lastListenedAt: new Date() },
				},
				{ upsert: true, new: true }
			);

			// Update guild stats
			await GuildStats.findOneAndUpdate(
				{ guildId },
				{
					$inc: { totalTracksPlayed: 1 },
				},
				{ upsert: true, new: true }
			);

			// Update track analytics
			await Track.findOneAndUpdate(
				{ trackId: `${artist}-${track}` },
				{
					$inc: { timesPlayed: 1 },
					$set: { title: track, artist, album, duration: durationMs, source: "spotify" },
				},
				{ upsert: true, new: true }
			);

			// Log activity
			await this.logActivity(guildId, userId, 'spotify_play', { track, artist, album });
		} catch (error) {
			console.error("Error tracking Spotify play:", error);
		}
	}
}

export const analyticsService = new AnalyticsService();

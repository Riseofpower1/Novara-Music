import { Event, type Lavamusic } from "../../structures/index";
import { ACHIEVEMENTS } from "../../achievements";
import { Achievement } from "../../database/models";

export default class AchievementTracker extends Event {
	private trackPlayCounts: Map<string, number> = new Map();
	private listeningTime: Map<string, number> = new Map();
	private sessionStartTime: Map<string, number> = new Map();

	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: "trackStart",
		});
	}

	public async run(player: any): Promise<void> {
		try {
			const guildId = player.guildId;
			const userId = player.guild?.members?.me?.user?.id;

			if (!userId || !guildId) return;

			// Track play count
			const currentCount = this.trackPlayCounts.get(guildId) || 0;
			this.trackPlayCounts.set(guildId, currentCount + 1);

			// Record session start time
			if (!this.sessionStartTime.has(guildId)) {
				this.sessionStartTime.set(guildId, Date.now());
			}

			// Get user stats (you may need to adjust this based on your analytics)
			const stats = {
				totalTracksPlayed: currentCount + 1,
				totalTimeListened: this.listeningTime.get(guildId) || 0,
				listeningStreak: 1, // Simplified - you'd calculate this from analytics
				favoriteGenres: [], // You'd populate from analytics
				favoriteArtists: [], // You'd populate from analytics
				playlistsCreated: 0, // You'd get from database
				peakListeningHours: [], // You'd calculate from analytics
				totalPlaylistSongs: 0, // You'd get from database
			};

			// Check for new achievements
			const newAchievements: string[] = [];
			for (const [_key, achievement] of Object.entries(ACHIEVEMENTS)) {
				if (achievement.condition(stats)) {
					newAchievements.push(achievement.id);
				}
			}

			// Get existing achievements
			let userAchievements = await Achievement.findOne({
				userId,
				guildId,
			});

			if (!userAchievements) {
				userAchievements = await Achievement.create({
					userId,
					guildId,
					achievements: [],
				});
			}

			const unlockedIds = userAchievements.achievements.map((a: any) => a.id);
			const freshlyUnlocked: any[] = [];

			// Add newly unlocked achievements
			for (const achId of newAchievements) {
				if (!unlockedIds.includes(achId)) {
					const achievement = ACHIEVEMENTS[achId];
					userAchievements.achievements.push({
						id: achievement.id,
						name: achievement.name,
						description: achievement.description,
						icon: achievement.icon,
						unlockedAt: new Date(),
					});
					freshlyUnlocked.push(achievement);
					unlockedIds.push(achId);
				}
			}

			if (freshlyUnlocked.length > 0) {
				await userAchievements.save();

				// Notify user about new achievements
				const guild = this.client.guilds.cache.get(guildId);
				if (guild) {
					const firstUser = guild.members.cache.first();
					if (firstUser?.user) {
						try {
							const dm = await firstUser.user.createDM();
							const achievementText = freshlyUnlocked
								.map((a) => `${a.icon} **${a.name}** - ${a.description}`)
								.join("\n");

							await dm.send({
								embeds: [
									this.client
										.embed()
										.setColor("#FFD700")
										.setTitle("🏆 New Achievement Unlocked!")
										.setDescription(achievementText),
								],
							});
						} catch (dmError) {
							// Silently fail if DM sending fails
						}
					}
				}
			}
		} catch (error) {
			this.client.logger.error(
				"[Achievement Tracker]",
				error instanceof Error ? error.message : String(error)
			);
		}
	}

	/**
	 * Track listening time
	 */
	public trackListeningTime(guildId: string, duration: number): void {
		const current = this.listeningTime.get(guildId) || 0;
		this.listeningTime.set(guildId, current + duration);
	}

	/**
	 * Get listening time for a guild
	 */
	public getListeningTime(guildId: string): number {
		return this.listeningTime.get(guildId) || 0;
	}

	/**
	 * Reset tracking for a guild
	 */
	public resetTracking(guildId: string): void {
		this.trackPlayCounts.delete(guildId);
		this.listeningTime.delete(guildId);
		this.sessionStartTime.delete(guildId);
	}
}

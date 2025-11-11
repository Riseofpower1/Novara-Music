export interface IAchievement {
	id: string;
	name: string;
	description: string;
	icon: string;
	condition: (stats: any) => boolean;
	reward?: string;
}

export const ACHIEVEMENTS: Record<string, IAchievement> = {
	first_song: {
		id: "first_song",
		name: "First Steps",
		description: "Play your first song",
		icon: "🎵",
		condition: (stats) => stats.totalTracksPlayed >= 1,
	},
	ten_songs: {
		id: "ten_songs",
		name: "Getting Started",
		description: "Play 10 songs",
		icon: "🎶",
		condition: (stats) => stats.totalTracksPlayed >= 10,
	},
	hundred_songs: {
		id: "hundred_songs",
		name: "Music Lover",
		description: "Play 100 songs",
		icon: "💿",
		condition: (stats) => stats.totalTracksPlayed >= 100,
	},
	thousand_songs: {
		id: "thousand_songs",
		name: "Obsessed",
		description: "Play 1000 songs",
		icon: "🎼",
		condition: (stats) => stats.totalTracksPlayed >= 1000,
	},
	hour_listening: {
		id: "hour_listening",
		name: "Binge Listener",
		description: "Listen for 1 hour straight",
		icon: "⏱️",
		condition: (stats) => stats.totalTimeListened >= 3600000,
	},
	day_listening: {
		id: "day_listening",
		name: "Marathon Listener",
		description: "Listen for 24 hours total",
		icon: "🏃",
		condition: (stats) => stats.totalTimeListened >= 86400000,
	},
	week_streak: {
		id: "week_streak",
		name: "Week Warrior",
		description: "Listen for 7 consecutive days",
		icon: "🔥",
		condition: (stats) => stats.listeningStreak >= 7,
	},
	genre_explorer: {
		id: "genre_explorer",
		name: "Genre Explorer",
		description: "Listen to 10 different genres",
		icon: "🌍",
		condition: (stats) => stats.favoriteGenres?.length >= 10,
	},
	artist_fan: {
		id: "artist_fan",
		name: "Fan Collector",
		description: "Listen to 50 different artists",
		icon: "👨‍🎤",
		condition: (stats) => stats.favoriteArtists?.length >= 50,
	},
	playlist_master: {
		id: "playlist_master",
		name: "Playlist Master",
		description: "Create 5 playlists",
		icon: "📝",
		condition: (stats) => stats.playlistsCreated >= 5,
	},
	night_owl: {
		id: "night_owl",
		name: "Night Owl",
		description: "Listen most between midnight and 4 AM",
		icon: "🌙",
		condition: (stats) => stats.peakListeningHours?.includes(0, 1, 2, 3),
	},
	early_bird: {
		id: "early_bird",
		name: "Early Bird",
		description: "Listen most between 5 AM and 8 AM",
		icon: "☀️",
		condition: (stats) => stats.peakListeningHours?.includes(5, 6, 7),
	},
	collector: {
		id: "collector",
		name: "Collector",
		description: "Save 100 songs to playlists",
		icon: "📚",
		condition: (stats) => stats.totalPlaylistSongs >= 100,
	},
};

export class AchievementManager {
	static checkAchievements(stats: any): string[] {
		const unlockedAchievements: string[] = [];

		for (const [_key, achievement] of Object.entries(ACHIEVEMENTS)) {
			if (achievement.condition(stats)) {
				unlockedAchievements.push(achievement.id);
			}
		}

		return unlockedAchievements;
	}

	static getAchievement(achievementId: string): IAchievement | null {
		return ACHIEVEMENTS[achievementId] || null;
	}

	static getAllAchievements(): IAchievement[] {
		return Object.values(ACHIEVEMENTS);
	}

	static getAchievementProgress(stats: any, achievementId: string): number {
		const achievement = ACHIEVEMENTS[achievementId];
		if (!achievement) return 0;

		// Calculate progress percentage based on condition
		// This is simplified and can be enhanced
		const condition = achievement.condition(stats);
		return condition ? 100 : 0;
	}
}

import mongoose from "mongoose";

// Guild Schema
const guildSchema = new mongoose.Schema(
	{
		guildId: { type: String, required: true, unique: true, index: true },
		prefix: { type: String, required: true },
		language: { type: String, default: "EnglishUS" },
		theme: { type: String, default: "default" },
	},
	{ timestamps: true }
);

// Setup Schema
const setupSchema = new mongoose.Schema(
	{
		guildId: { type: String, required: true, unique: true, index: true },
		textId: { type: String, required: true },
		messageId: { type: String, required: true },
	},
	{ timestamps: true }
);

// Stay Schema (for 24/7 mode)
const staySchema = new mongoose.Schema(
	{
		guildId: { type: String, required: true, unique: true, index: true },
		textId: { type: String, required: true },
		voiceId: { type: String, required: true },
	},
	{ timestamps: true }
);

// DJ Schema
const djSchema = new mongoose.Schema(
	{
		guildId: { type: String, required: true, unique: true, index: true },
		mode: { type: Boolean, default: false },
	},
	{ timestamps: true }
);

// Role Schema
const roleSchema = new mongoose.Schema(
	{
		guildId: { type: String, required: true, index: true },
		roleId: { type: String, required: true },
	},
	{ timestamps: true }
);

// Playlist Schema
const playlistSchema = new mongoose.Schema(
	{
		userId: { type: String, required: true, index: true },
		name: { type: String, required: true },
		tracks: { type: [String], default: [] },
		// Collaborative playlist features
		isCollaborative: { type: Boolean, default: false },
		collaborators: [{ userId: String, permission: { type: String, enum: ["read", "write"], default: "write" } }],
		// Sharing features
		isPublic: { type: Boolean, default: false },
		sharedWith: [{ userId: String, permission: { type: String, enum: ["read", "write"], default: "read" } }],
		// Statistics
		playCount: { type: Number, default: 0 },
		lastPlayedAt: { type: Date },
		description: { type: String, maxlength: 500 },
	},
	{ timestamps: true }
);

playlistSchema.index({ userId: 1, name: 1 }, { unique: true });
playlistSchema.index({ isPublic: 1 }); // For finding public playlists
playlistSchema.index({ "collaborators.userId": 1 }); // For finding playlists user collaborates on
playlistSchema.index({ "sharedWith.userId": 1 }); // For finding playlists shared with user

// User Statistics Schema
const userStatsSchema = new mongoose.Schema(
	{
		userId: { type: String, required: true, unique: true, index: true },
		totalTracksPlayed: { type: Number, default: 0 },
		totalTimeListened: { type: Number, default: 0 }, // in milliseconds
		favoriteGenres: [{ genre: String, count: Number }],
		favoriteArtists: [{ artist: String, count: Number }],
		topTracks: [{ track: String, artist: String, count: Number }],
		listeningStreak: { type: Number, default: 0 }, // days
		lastListenedAt: { type: Date },
	},
	{ timestamps: true }
);

// Guild Statistics Schema
const guildStatsSchema = new mongoose.Schema(
	{
		guildId: { type: String, required: true, unique: true, index: true },
		totalTracksPlayed: { type: Number, default: 0 },
		uniqueUsers: { type: Number, default: 0 },
		topTracks: [{ track: String, artist: String, count: Number }],
		topArtists: [{ artist: String, count: Number }],
		topGenres: [{ genre: String, count: Number }],
		peakHours: [{ hour: Number, plays: Number }],
	},
	{ timestamps: true }
);

// Track Schema (for analytics)
const trackSchema = new mongoose.Schema(
	{
		trackId: { type: String, unique: true, index: true },
		title: String,
		artist: String,
		duration: Number,
		genre: String,
		timesPlayed: { type: Number, default: 0 },
		averageRating: { type: Number, default: 0 },
	},
	{ timestamps: true }
);

// Achievement Schema
const achievementSchema = new mongoose.Schema(
	{
		userId: { type: String, required: true, index: true },
		guildId: { type: String, required: true, index: true },
		achievements: [
			{
				id: String,
				name: String,
				description: String,
				unlockedAt: Date,
				icon: String,
			},
		],
	},
	{ timestamps: true }
);

// Spotify User Schema
const spotifyUserSchema = new mongoose.Schema(
	{
		userId: { type: String, required: true, unique: true, index: true },
		spotifyId: String,
		accessToken: String,
		refreshToken: String,
		expiresAt: Date,
		displayName: String,
		profileImage: String,
	},
	{ timestamps: true }
);

// Last.fm User Schema
const lastfmUserSchema = new mongoose.Schema(
	{
		userId: { type: String, required: true, unique: true, index: true },
		lastfmUsername: String,
		sessionKey: String,
		scrobbleEnabled: { type: Boolean, default: false },
	},
	{ timestamps: true }
);

// Recommendation Schema
const recommendationSchema = new mongoose.Schema(
	{
		userId: { type: String, required: true, index: true },
		guildId: { type: String, required: true, index: true },
		recommendations: [
			{
				track: String,
				artist: String,
				score: Number,
				reason: String,
			},
		],
		generatedAt: { type: Date, default: Date.now },
	},
	{ timestamps: true }
);

// Activity Log Schema
const activityLogSchema = new mongoose.Schema(
	{
		guildId: { type: String, required: true, index: true },
		userId: { type: String, required: true, index: true },
		eventType: { 
			type: String, 
			enum: [
				'track_play', 
				'achievement_unlock', 
				'milestone',
				'track_paused',
				'track_resumed',
				'player_disconnect',
				'player_destroyed',
				'queue_end',
				'pause_command',
				'stop_command',
				'resume_command',
				'skip_command',
				'track_skipped',
				'seek_operation',
				'queue_shuffled',
				'loop_mode_changed',
				'volume_changed',
				'command_executed',
				'voice_join',
				'voice_leave'
			], 
			required: true 
		},
		track: String,
		artist: String,
		achievement: String,
		description: String,
		timestamp: { type: Date, default: Date.now, index: true },
	},
	{ timestamps: true }
);

activityLogSchema.index({ guildId: 1, timestamp: -1 });
activityLogSchema.index({ userId: 1, timestamp: -1 }); // For user activity queries
activityLogSchema.index({ eventType: 1, timestamp: -1 }); // For event type queries

// Achievement Schema - compound index for user/guild lookups
achievementSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Recommendation Schema - compound index
recommendationSchema.index({ userId: 1, guildId: 1 });
recommendationSchema.index({ guildId: 1, generatedAt: -1 }); // For recent recommendations

// Role Schema - compound index for guild/role lookups
roleSchema.index({ guildId: 1, roleId: 1 }, { unique: true });

// Track Schema - indexes for analytics queries
trackSchema.index({ timesPlayed: -1 }); // For popular tracks
trackSchema.index({ artist: 1, timesPlayed: -1 }); // For artist popularity
trackSchema.index({ genre: 1, timesPlayed: -1 }); // For genre popularity

// UserStats Schema - indexes for leaderboards
userStatsSchema.index({ totalTracksPlayed: -1 }); // For top listeners
userStatsSchema.index({ totalTimeListened: -1 }); // For time-based leaderboards
userStatsSchema.index({ lastListenedAt: -1 }); // For recent activity

// GuildStats Schema - indexes for analytics
guildStatsSchema.index({ totalTracksPlayed: -1 }); // For top guilds

// SpotifyUser Schema - index for expired token queries
spotifyUserSchema.index({ expiresAt: 1 }); // For finding expired tokens

// LastfmUser Schema - index for scrobble enabled users
lastfmUserSchema.index({ scrobbleEnabled: 1, userId: 1 }); // For finding scrobble-enabled users

// Community Playlist Schema
const communityPlaylistSchema = new mongoose.Schema(
	{
		guildId: { type: String, required: true, index: true },
		name: { type: String, required: true },
		description: String,
		createdBy: { type: String, required: true },
		tracks: [
			{
				track: String,
				artist: String,
				addedBy: String,
				addedAt: { type: Date, default: Date.now },
				plays: { type: Number, default: 0 },
			},
		],
		isPublic: { type: Boolean, default: true },
		followers: [{ type: String }],
		createdAt: { type: Date, default: Date.now },
	},
	{ timestamps: true }
);

communityPlaylistSchema.index({ guildId: 1, isPublic: 1 });

// Export models
export const Guild =
	mongoose.models.Guild || mongoose.model("Guild", guildSchema);
export const Setup =
	mongoose.models.Setup || mongoose.model("Setup", setupSchema);
export const Stay = mongoose.models.Stay || mongoose.model("Stay", staySchema);
export const Dj = mongoose.models.Dj || mongoose.model("Dj", djSchema);
export const Role = mongoose.models.Role || mongoose.model("Role", roleSchema);
export const Playlist =
	mongoose.models.Playlist || mongoose.model("Playlist", playlistSchema);
export const UserStats =
	mongoose.models.UserStats || mongoose.model("UserStats", userStatsSchema);
export const GuildStats =
	mongoose.models.GuildStats ||
	mongoose.model("GuildStats", guildStatsSchema);
export const Track = mongoose.models.Track || mongoose.model("Track", trackSchema);
export const Achievement =
	mongoose.models.Achievement ||
	mongoose.model("Achievement", achievementSchema);
export const SpotifyUser =
	mongoose.models.SpotifyUser ||
	mongoose.model("SpotifyUser", spotifyUserSchema);
export const LastfmUser =
	mongoose.models.LastfmUser ||
	mongoose.model("LastfmUser", lastfmUserSchema);
export const Recommendation =
	mongoose.models.Recommendation ||
	mongoose.model("Recommendation", recommendationSchema);
// User Identity Mapping Schema (links Discord ID to Dashboard user)
const userIdentitySchema = new mongoose.Schema(
	{
		discordId: { type: String, required: true, unique: true, index: true },
		dashboardUserId: { type: String, required: true, index: true },
		username: { type: String },
		avatar: { type: String },
		linkedAt: { type: Date, default: Date.now },
	},
	{ timestamps: true }
);

export const ActivityLog =
	mongoose.models.ActivityLog ||
	mongoose.model("ActivityLog", activityLogSchema);
export const CommunityPlaylist =
	mongoose.models.CommunityPlaylist ||
	mongoose.model("CommunityPlaylist", communityPlaylistSchema);
export const UserIdentity =
	mongoose.models.UserIdentity ||
	mongoose.model("UserIdentity", userIdentitySchema);


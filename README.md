# 🎵 Novara Music

A feature-rich Discord music bot built with Discord.js and Lavalink, providing seamless music playback, advanced filtering, and social integrations.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Discord.js Version](https://img.shields.io/badge/discord.js-v14.0.0-blue)](https://discord.js.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](#license)

## ✨ Features

### 🎶 Music Playback
- **Play** - Play songs from YouTube, Spotify, SoundCloud, and more
- **Queue Management** - View, remove, and rearrange songs in your queue
  - Position indicators with estimated play times
  - Queue history tracking (recently played tracks)
  - Queue sharing and export
  - Smart reordering (move, swap, group by requester/duration)
- **Loop Control** - Single track loop, full queue loop, and autoplay modes
- **Search** - Find and play songs with advanced search capabilities
- **Lyrics** - Display song lyrics using Genius API
- **Now Playing** - Show currently playing track information
- **Playlist Support** - Create and manage custom playlists
  - Collaborative playlists with permissions
  - Public/private sharing
  - Import/export playlists (JSON format)
  - Playlist statistics and analytics
- **Fair Play** - Queue songs fairly when multiple requests are made
- **Auto-play** - Continue playing related songs when queue ends

### 🎛️ Audio Filters
Apply advanced audio effects to enhance your listening experience:
- **8D Audio** - Surround sound effect
- **Bass Boost** - Enhanced low-end frequencies
- **Nightcore** - Increased pitch and speed
- **Karaoke** - Vocal isolation effects
- **Tremolo** - Volume modulation
- **Vibrato** - Pitch modulation
- **Rotation** - 3D rotation effect
- **Low Pass** - Smooth treble reduction
- **Pitch Control** - Adjust tone without changing speed
- **Rate Control** - Speed up or slow down music
- **Reset** - Clear all audio effects

### 🔗 Integrations
- **Spotify Integration** - Link Spotify account for enhanced features
  - View currently playing Spotify tracks
  - Access your Spotify top tracks
  - Auto-scrobble to Spotify
- **Last.fm Integration** - Track your music history
  - Scrobble tracks to Last.fm
  - View listening statistics
  - Access your listening history
- **Modal-based OAuth** - Seamless in-Discord linking without web server

### 🛠️ Advanced Features
- **Multi-language Support** - Available in 17 languages
- **DJ Mode** - Restrict commands to DJ role members
- **Permissions** - Fine-grained access control
- **Analytics** - Track bot usage and user statistics
- **Theme System** - Customize embed colors and styling
- **Setup Wizard** - Easy configuration for new servers
- **Logging** - Comprehensive activity logging
- **Error Handling** - Robust error handling with retry logic and user-friendly messages
- **Memory Management** - Automatic memory monitoring and leak detection
- **Performance Optimization** - Database query optimization with indexing and caching
- **Event System** - Event middleware, metrics tracking, and replay capabilities
- **Command Middleware** - Logging, analytics, and permission middleware for commands
- **Bot Status Reporting** - Optional status reporting to external API with Discord embed updates

### 📊 Commands
Over 70 commands organized in categories:
- **Music** - play, skip, pause, resume, queue, queuehistory, queueshare, move, swap, loop, lyrics, and more
- **Filters** - 8d, bassboost, nightcore, karaoke, tremolo, vibrato, and more
- **Playlist** - create, delete, add/remove songs, view playlists, export, import, stats, share
- **Config** - setup, prefix, language, dj, link, unlink
- **Info** - help, about, botinfo, ping, stats
- **Developer** - eval, deploy, restart, shutdown

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- MongoDB instance (local or Atlas)
- Discord bot token
- Lavalink server

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Riseofpower1/Novara-Music.git
cd Novara-Music
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Create a `.env` file in the root directory:
```env
# Discord Bot
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
PREFIX=!

# Database
MONGODB_URI=mongodb://localhost:27017/novara-music
# or for MongoDB Atlas:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/novara-music

# Lavalink
LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false

# Spotify (Optional)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://novara.cloud-ip.cc:3000/auth/spotify/callback

# Last.fm (Optional)
LASTFM_API_KEY=your_lastfm_api_key
LASTFM_API_SECRET=your_lastfm_api_secret
LASTFM_REDIRECT_URI=https://novara.cloud-ip.cc:3000/auth/lastfm/callback

# SSL Certificates (Optional - for HTTPS OAuth)
USE_HTTPS=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# Genius Lyrics API (Optional)
GENIUS_ACCESS_TOKEN=your_genius_token

# Bot Status Reporting (Optional)
BOT_STATUS_URL=http://localhost:3006/api/bot-status
BOT_STATUS_TOKEN=your_status_api_token
BOT_STATUS_CHANNEL_ID=your_discord_channel_id
BOT_STATUS_INSECURE_SSL=false
```

4. **Start the bot**
```bash
npm start
```

## 📋 Configuration

### Setup Command
Use `/setup` to configure the bot for your server:
- Set text channel for setup
- Configure DJ role
- Set language
- Configure prefix

### Commands Structure
```
/help [command]          - Show all commands or command details
/prefix <prefix>         - Change bot prefix
/language <language>     - Set server language
/setup                   - Configure bot for server
/dj <add|remove|toggle>  - Manage DJ role
```

## 🎮 Usage Examples

### Playing Music
```
/play <song_name_or_url>
/search <song_name>
/queue                    - View queue with position indicators
/queuehistory            - View recently played tracks
/queueshare              - Export and share queue
/move <from> <to>        - Move track to different position
/swap <pos1> <pos2>      - Swap two tracks in queue
/skip
/pause
/resume
```

### Using Filters
```
/8d
/bassboost
/nightcore
/karaoke
/reset
```

### Playlist Management
```
/playlist create <name>          - Create a new playlist
/playlist add <url|search>        - Add songs to playlist
/playlist play <name>             - Load playlist into queue
/playlist delete <name>           - Delete a playlist
/playlist export <name>          - Export playlist to JSON
/playlist import <name> <json>   - Import playlist from JSON
/playlist stats <name>           - View playlist statistics
/playlist share <name> <user>    - Share playlist with user
```

### Linking Accounts
```
/spotifylink              - Link Spotify account
/lastfmlink              - Link Last.fm account
/unlink <service>        - Unlink Spotify or Last.fm
```

## 🔐 OAuth Flow (No Web Server Required)

Novara Music uses a modal-based OAuth system that keeps users entirely in Discord:

### Spotify Linking
1. Run `/spotifylink`
2. Click "🔗 Authorize with Spotify" button
3. Authorize the application on Spotify
4. Copy the authorization code
5. Click "📋 Enter Code" button in Discord
6. Paste the code in the modal
7. Done! Your account is linked

### Last.fm Linking
Same process as Spotify - everything happens within Discord modals.

## 📦 Architecture

### Core Structure
```
src/
├── commands/          - All bot commands
│   ├── music/        - Music playback commands
│   ├── filters/      - Audio filter commands
│   ├── playlist/     - Playlist management
│   ├── config/       - Configuration commands
│   ├── info/         - Information commands
│   └── dev/          - Developer commands
├── events/           - Discord.js event handlers
├── structures/       - Core classes and utilities
├── database/         - Database models and queries
├── integrations/     - Third-party API integrations
├── oauth/            - OAuth services (Spotify, Last.fm)
├── utils/            - Utility functions
├── themes/           - Embed color schemes
└── config.ts         - Bot configuration
```

### Key Components

**SpotifyOAuthService** (`src/oauth/spotify.ts`)
- Handles Spotify authorization code flow
- Manages token exchange and refresh
- Stores user credentials securely
- Retry logic with exponential backoff

**LastfmOAuthService** (`src/oauth/lastfm.ts`)
- Manages Last.fm OAuth flow
- Generates MD5 signatures for API requests
- Handles session key management
- Retry logic with exponential backoff

**OAuthRedirectHandler** (`src/oauth/redirectHandler.ts`)
- Express.js server for OAuth callbacks
- Minimal footprint - only handles redirects
- Beautiful HTML UI for displaying authorization tokens
- HTTPS support with SSL certificates

**Command Structure** (`src/structures/Command.ts`)
- Base command class with validation
- Permission checking
- DJ mode enforcement
- Enhanced cooldown management (per-user, per-guild, per-channel, global)
- Command middleware support (logging, analytics, permissions)
- Argument validation utilities

**Error Handling** (`src/utils/errors/`)
- Custom error classes (BotError, APIError, DatabaseError, etc.)
- Centralized error handling with context
- Retry logic with exponential backoff
- User-friendly error messages

**Memory Management** (`src/utils/memoryManager.ts`)
- Automatic memory monitoring
- Memory leak detection
- Cache cleanup and optimization
- Performance tracking

**Database Optimization** (`src/database/queryOptimization.ts`)
- Query performance monitoring
- Batch operations
- Optimized projections
- Index management

## 🗄️ Database Models

Uses MongoDB with Mongoose:
- **User** - User profiles and settings
- **Guild** - Server-specific configurations
- **SpotifyUser** - Spotify account links
- **LastfmUser** - Last.fm account links
- **Playlist** - Custom user playlists (with collaboration and sharing features)
- **Analytics** - Bot usage statistics
- **UserStats** - User listening statistics
- **Track** - Track analytics and metadata
- **Achievement** - User achievements
- **Recommendation** - Music recommendations

### Database Features
- **Query Optimization** - Indexed queries for better performance
- **Batch Operations** - Efficient bulk insert/update/delete operations
- **Performance Monitoring** - Automatic tracking of slow queries
- **Connection Pooling** - Optimized connection management

## 🔄 Event Handlers

Organized by type:
- **Client Events** - Ready, error, rateLimit
- **Player Events** - trackStart, trackEnd, queueEnd
- **Node Events** - nodeReady, nodeError
- **Interaction Events** - Commands, buttons, modals

### Event System Features
- **Event Middleware** - Logging, metrics, and replay middleware
- **Event Metrics** - Track event firing counts and error rates
- **Event Replay** - Replay events for debugging (stores last 1000 events)
- **Error Tracking** - Automatic error tracking for all events

## 🌍 Supported Languages

- 🇺🇸 English (US)
- 🇩🇪 German
- 🇫🇷 French
- 🇪🇸 Spanish
- 🇮🇹 Italian
- 🇵🇹 Portuguese
- 🇵🇱 Polish
- 🇳🇴 Norwegian
- 🇯🇵 Japanese
- 🇰🇷 Korean
- 🇷🇺 Russian
- 🇹🇭 Thai
- 🇹🇷 Turkish
- 🇻🇳 Vietnamese
- 🇮🇩 Indonesian
- 🇮🇳 Hindi
- 🇨🇳 Chinese (Simplified & Traditional)
- 🇳🇱 Dutch

## 📝 Logging & Monitoring

The bot provides comprehensive logging and monitoring:
- **Console Logging** - Real-time output with color coding
- **File Logging** - Persistent logs in `logs/` directory
- **Error Tracking** - Detailed error information with context
- **Activity Tracking** - Command usage and events
- **Memory Monitoring** - Automatic memory usage tracking and leak detection
- **Performance Metrics** - Database query performance and event metrics
- **Bot Status Reporting** - Optional status reporting to external API

## 🛡️ Security

- **Token Protection** - All credentials stored in `.env`
- **Rate Limiting** - Built-in Discord rate limit handling
- **Permission Verification** - Server and user permission checks
- **Input Validation** - Sanitized command inputs with Zod validation
- **HTTPS Support** - SSL certificates for OAuth redirects
- **Secure OAuth** - No sensitive data exposed to users
- **SSL Certificate Validation** - Configurable SSL validation (defaults to secure)
- **Error Handling** - Comprehensive error handling prevents information leakage
- **Type Safety** - Strong TypeScript typing reduces runtime errors

## 🐛 Troubleshooting

### Bot Won't Start
- Check `DISCORD_TOKEN` is valid
- Verify MongoDB connection
- Ensure Lavalink server is running

### Music Won't Play
- Check Lavalink is connected
- Verify song is available in region
- Ensure bot has "Connect" and "Speak" permissions

### Spotify Linking Issues
- **invalid_grant**: Code expired (>10 minutes) - Try again quickly
- **User not authorized**: Add your email to Spotify Developer Dashboard > User Management
- **Redirect URI mismatch**: Verify `.env` matches Spotify Dashboard setting

### Last.fm Linking Issues
- **Invalid token**: Token may have expired - Try linking again
- **User info failed**: Account may have restrictions - Try different Last.fm account

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License with a Commercial Use Clause - see [LICENSE](LICENSE) file for details.

**Key Terms:**
- Free to use, modify, and distribute for personal and non-commercial use
- If you commercialize this software, you must provide 30% commission to Riseofpower1
- See LICENSE file for complete terms

## 🔐 Privacy Policy

We take your privacy seriously. See our [Privacy Policy](PRIVACY_POLICY.md) for details on:
- What data we collect
- How we use your information
- Your rights and choices
- Third-party integrations
- GDPR and CCPA compliance

## 🙏 Credits

- Original Creator: [appujet](https://github.com/appujet)
- Current Maintainer: [Riseofpower1](https://github.com/Riseofpower1)
- Built with [Discord.js](https://discord.js.org/)
- Music powered by [Lavalink](https://lavalink.dev/)
- Database by [MongoDB](https://www.mongodb.com/)

## 📞 Support

- **Discord Server**: [Join our Discord](https://discord.gg/2tEDK2qvbu)
- **Issues**: [GitHub Issues](https://github.com/Riseofpower1/Novara-Music/issues)
- **Documentation**: Check the [Wiki](https://github.com/Riseofpower1/Novara-Music/wiki)

## 🎯 Roadmap

- [ ] Web Dashboard (Optional)
- [ ] YouTube Music Integration
- [ ] Apple Music Integration
- [ ] Equalizer Presets
- [ ] Custom Command Creation
- [ ] Music Recommendation System
- [ ] User Profiles
- [ ] Leaderboards

---

Made with ❤️ by the Novara Music team

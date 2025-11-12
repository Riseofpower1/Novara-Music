/**
 * Bot Status Reporter
 * Use this in your Discord bots to report status to the website
 * 
 * Installation:
 * 1. Copy this file to your bot project
 * 2. npm install axios (if not already installed)
 * 3. Set BOT_STATUS_URL and BOT_STATUS_TOKEN in your .env
 * 
 * Usage:
 * const BotStatusReporter = require('./bot-status-reporter');
 * 
 * // In your bot's ready event or a periodic task:
 * BotStatusReporter.updateStatus({
 *   botId: 'your_bot_id',
 *   name: 'Your Bot Name',
 *   servers: client.guilds.cache.size,
 *   users: client.users.cache.size,
 * });
 */

const axios = require('axios');
const https = require('https');

const BOT_STATUS_URL = process.env.BOT_STATUS_URL || 'http://localhost:3000/api/bot-status';
const BOT_STATUS_TOKEN = process.env.BOT_STATUS_TOKEN;

// Create HTTPS agent that allows self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

class BotStatusReporter {
  /**
   * Update bot status on the website
   * @param statusData - Bot status information
   */
  static async updateStatus(statusData) {
    try {
      if (!BOT_STATUS_TOKEN) {
        console.warn('⚠️  BOT_STATUS_TOKEN not set in environment variables');
        return false;
      }

      const payload = {
        ...statusData,
        online: statusData.online !== undefined ? statusData.online : true,
        servers: statusData.servers || 0,
        users: statusData.users || 0,
        uptime: statusData.uptime || '99.9%',
        token: BOT_STATUS_TOKEN,
      };

      console.log(`📡 [${statusData.name}] Payload being sent:`, { 
        botId: payload.botId, 
        name: payload.name, 
        online: payload.online, 
        servers: payload.servers, 
        users: payload.users 
      });

      const response = await axios.post(BOT_STATUS_URL, payload, {
        timeout: 5000,
        httpsAgent: httpsAgent,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        console.log(`✅ [${statusData.name}] Status updated successfully`);
        console.log(`   Servers: ${statusData.servers || 0} | Users: ${statusData.users || 0} | Online: ${payload.online}`);
        return true;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`❌ [${statusData.name}] Failed to update status:`, error.message);
        if (error.response) {
          console.error(`   Status: ${error.response.status}`, error.response.data);
        }
      } else {
        console.error(`❌ [${statusData.name}] Unexpected error:`, error);
      }
      return false;
    }
  }

  /**
   * Set up automatic status updates (runs every 5 minutes)
   * @param client - Discord.js client
   * @param botId - Your bot's Discord ID
   * @param botName - Your bot's display name
   * @param intervalMinutes - Update interval in minutes (default: 5)
   */
  static setupAutoUpdate(
    client,
    botId,
    botName,
    intervalMinutes = 5
  ) {
    // Update immediately on startup
    this.updateStatus({
      botId,
      name: botName,
      servers: client.guilds.cache.size,
      users: client.users.cache.size,
    });

    // Update periodically
    const interval = setInterval(() => {
      this.updateStatus({
        botId,
        name: botName,
        servers: client.guilds.cache.size,
        users: client.users.cache.size,
      });
    }, intervalMinutes * 60 * 1000);

    console.log(`📊 Auto-update enabled for ${botName} (every ${intervalMinutes} minutes)`);
    return interval;
  }
}

module.exports = BotStatusReporter;

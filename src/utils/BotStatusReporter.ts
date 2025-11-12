import axios from "axios";

interface StatusData {
  botId: string;
  name: string;
  servers: number;
  users: number;
  online?: boolean;
  uptime?: string;
}

export class BotStatusReporter {
  private static BOT_STATUS_URL =
    process.env.BOT_STATUS_URL || "http://localhost:3006/api/bot-status";
  private static BOT_STATUS_TOKEN = process.env.BOT_STATUS_TOKEN;
  private static updateInterval: NodeJS.Timeout | null = null;
  private static isOnline: boolean = false;

  /**
   * Test connection to the API endpoint
   */
  static async testConnection(): Promise<boolean> {
    try {
      console.log(`🔍 Testing connection to ${this.BOT_STATUS_URL}...`);
      const response = await axios.get(this.BOT_STATUS_URL, {
        timeout: 5000,
        httpsAgent: {
          rejectUnauthorized: false,
        } as any,
      });
      console.log(`✅ Connection test successful (Status: ${response.status})`);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`❌ Connection test failed: ${error.message}`);
        if (error.code) {
          console.error(`   Error Code: ${error.code}`);
        }
        if (error.response?.status) {
          console.error(`   HTTP Status: ${error.response.status}`);
        }
      } else {
        console.error(`❌ Connection test failed:`, error);
      }
      return false;
    }
  }

  /**
   * Update bot status on the website
   */
  static async updateStatus(statusData: StatusData): Promise<boolean> {
    try {
      if (!this.BOT_STATUS_TOKEN) {
        // Bot status reporting is disabled (no token configured)
        return false;
      }

      const payload = {
        ...statusData,
        online: statusData.online !== undefined ? statusData.online : this.isOnline,
        servers: statusData.servers || 0,
        users: statusData.users || 0,
        uptime: statusData.uptime || "99.9%",
        token: this.BOT_STATUS_TOKEN,
      };

      console.log(`📤 [${statusData.name}] Sending status update - Online: ${payload.online}, Servers: ${payload.servers}`);
      console.log(`   Full Payload: ${JSON.stringify(payload, null, 2)}`);
      console.log(`   URL: ${this.BOT_STATUS_URL}`);

      const response = await axios.post(this.BOT_STATUS_URL, payload, {
        timeout: 5000,
        headers: {
          "Content-Type": "application/json",
        },
        httpsAgent: {
          rejectUnauthorized: false,
        } as any,
      });

      console.log(`📡 Response received - Status: ${response.status}`);
      if (response.status === 200) {
        console.log(`✅ [${statusData.name}] Status updated successfully`);
        console.log(
          `   Servers: ${statusData.servers || 0} | Users: ${statusData.users || 0}`
        );
        return true;
      }
      console.log(`⚠️ Unexpected response status: ${response.status}`);
      return false;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          `❌ [${statusData.name}] Failed to update status:`,
          error.message
        );
        if (error.response) {
          console.error(`   Status: ${error.response.status}`, error.response.data);
        } else if (error.request) {
          console.error(`   No response received - Request details:`, error.request);
        } else {
          console.error(`   Error setting up request:`, error);
        }
      } else {
        console.error(`❌ [${statusData.name}] Unexpected error:`, error);
      }
      return false;
    }
  }

  /**
   * Set up automatic status updates
   * @param client - Discord.js client
   * @param botId - Your bot's Discord ID
   * @param botName - Your bot's display name
   * @param intervalMinutes - Update interval in minutes (default: 5)
   */
  static setupAutoUpdate(
    client: any,
    botId: string,
    botName: string,
    intervalMinutes: number = 5
  ): NodeJS.Timeout {
    // Update immediately on startup with explicit online: true
    // Use getTotalUserCount if available (async method)
    if (client.getTotalUserCount && typeof client.getTotalUserCount === 'function') {
      client.getTotalUserCount().then((userCount: number) => {
        this.updateStatus({
          botId,
          name: botName,
          servers: client.guilds.cache.size,
          users: userCount,
          online: true,
        });
      }).catch(() => {
        // Fallback to cached users if fetch fails
        this.updateStatus({
          botId,
          name: botName,
          servers: client.guilds.cache.size,
          users: client.users.cache.size,
          online: true,
        });
      });
    } else {
      this.updateStatus({
        botId,
        name: botName,
        servers: client.guilds.cache.size,
        users: client.users.cache.size,
        online: true,
      });
    }

    // Update periodically
    this.updateInterval = setInterval(() => {
      // Only send periodic updates if bot is online
      if (this.isOnline) {
        // Use getTotalUserCount if available
        if (client.getTotalUserCount && typeof client.getTotalUserCount === 'function') {
          client.getTotalUserCount().then((userCount: number) => {
            this.updateStatus({
              botId,
              name: botName,
              servers: client.guilds.cache.size,
              users: userCount,
              online: true,
            });
          }).catch(() => {
            // Fallback to cached users if fetch fails
            this.updateStatus({
              botId,
              name: botName,
              servers: client.guilds.cache.size,
              users: client.users.cache.size,
              online: true,
            });
          });
        } else {
          this.updateStatus({
            botId,
            name: botName,
            servers: client.guilds.cache.size,
            users: client.users.cache.size,
            online: true,
          });
        }
      }
    }, intervalMinutes * 60 * 1000);

    console.log(
      `📊 Auto-update enabled for ${botName} (every ${intervalMinutes} minutes)`
    );
    return this.updateInterval;
  }

  /**
   * Stop automatic status updates
   */
  static stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log("🛑 Bot status auto-update stopped");
    }
  }

  /**
   * Mark bot as online
   */
  static setOnline(): void {
    this.isOnline = true;
  }

  /**
   * Mark bot as offline
   */
  static setOffline(): void {
    this.isOnline = false;
  }

  /**
   * Send offline status to website (for shutdown)
   */
  static async notifyOffline(botId: string, botName: string, servers: number = 0, users: number = 0): Promise<boolean> {
    try {
      if (!this.BOT_STATUS_TOKEN) {
        return false;
      }

      const payload = {
        botId,
        name: botName,
        servers,
        users,
        online: false,
        token: this.BOT_STATUS_TOKEN,
      };

      console.log(`📤 [${botName}] Sending offline notification to website...`);
      console.log(`📋 Payload:`, JSON.stringify(payload, null, 2));

      const response = await axios.post(this.BOT_STATUS_URL, payload, {
        timeout: 10000, // Increased timeout to 10 seconds
        headers: {
          "Content-Type": "application/json",
        },
        httpsAgent: {
          rejectUnauthorized: false,
        } as any,
      });

      console.log(`📡 Response status: ${response.status}`);
      if (response.status === 200) {
        console.log(`✅ [${botName}] Offline status sent to website`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Failed to send offline notification:`, error instanceof Error ? error.message : error);
      return false;
    }
  }
}

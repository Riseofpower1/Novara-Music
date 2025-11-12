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

  // Store last status message ID for editing
  private static lastStatusMessageId: string | null = null;
  private static statusChannelId = "1438198696507605193";

  /**
   * Send or edit a status embed in the status channel
   */
  static async updateStatusEmbed(client: any, statusData: StatusData) {
    try {
      const channel = await client.channels.fetch(this.statusChannelId);
      if (!channel || !channel.isTextBased()) return;

      const online = statusData.online !== undefined ? statusData.online : this.isOnline;
      const statusDot = online ? "🟢" : "🔴";
      const statusText = online ? "Online" : "Offline";
      const color = online ? 0x43b581 : 0xf04747;
      // Format uptime as e.g. 0h 0m 2s
      let uptime = statusData.uptime || "";
      if (!uptime || uptime === "99.9%") {
        uptime = "N/A";
      }
      // If uptime is in ms, format it
      if (/^\d+$/.test(uptime)) {
        const ms = parseInt(uptime, 10);
        const s = Math.floor((ms / 1000) % 60);
        const m = Math.floor((ms / (1000 * 60)) % 60);
        const h = Math.floor((ms / (1000 * 60 * 60)) % 24);
        uptime = `${h}h ${m}m ${s}s`;
      }

      const embed = {
        color,
        title: `Novara Music Status`,
        thumbnail: {
          url: 'https://novaraproject.co.uk/logo.png'
        },
        fields: [
          {
            name: `🖥️ Servers`,
            value: `${statusData.servers}`,
            inline: true,
          },
          {
            name: `👥 Users`,
            value: `${statusData.users}`,
            inline: true,
          },
          {
            name: `🔵 Status`,
            value: `${statusDot} ${statusText}`,
            inline: true,
          },
          {
            name: `⏰ Uptime`,
            value: uptime,
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      };

      // If we have a previous message, try to edit it
      if (this.lastStatusMessageId) {
        try {
          const msg = await channel.messages.fetch(this.lastStatusMessageId);
          await msg.edit({ embeds: [embed] });
          return;
        } catch (e) {
          // If message not found, fall through to send new
        }
      }
      // Otherwise, send a new message and store its ID
      const sent = await channel.send({ embeds: [embed] });
      this.lastStatusMessageId = sent.id;
    } catch (err) {
      console.error("[BOT STATUS] Failed to send/edit status embed:", err);
    }
  }

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
  static async updateStatus(statusData: StatusData, client?: any): Promise<boolean> {
    try {
      if (!this.BOT_STATUS_TOKEN) {
        // Bot status reporting is disabled (no token configured)
        return false;
      }

      // Ensure uptime is always a valid string representing milliseconds
      let rawUptime = statusData.uptime;
      if (!rawUptime || isNaN(Number(rawUptime))) {
        if (client && typeof client.uptime === 'number') {
          rawUptime = client.uptime.toString();
        } else {
          rawUptime = "0";
        }
      }
      // Format uptime for website just like the embed
      let formattedUptime = rawUptime;
      if (!formattedUptime || formattedUptime === "99.9%") {
        formattedUptime = "N/A";
      }
      if (/^\d+$/.test(formattedUptime)) {
        const ms = parseInt(formattedUptime, 10);
        const s = Math.floor((ms / 1000) % 60);
        const m = Math.floor((ms / (1000 * 60)) % 60);
        const h = Math.floor((ms / (1000 * 60 * 60)) % 24);
        formattedUptime = `${h}h ${m}m ${s}s`;
      }

      const payload = {
        ...statusData,
        online: statusData.online !== undefined ? statusData.online : this.isOnline,
        servers: statusData.servers || 0,
        users: statusData.users || 0,
        uptime: formattedUptime,
        token: this.BOT_STATUS_TOKEN,
      };

      console.log(`📤 [${statusData.name}] Sending status update - Online: ${payload.online}, Servers: ${payload.servers}`);
      console.log(`   Full Payload: ${JSON.stringify(payload, null, 2)}`);
      console.log(`   URL: ${this.BOT_STATUS_URL}`);

      // Send to website API
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
        // Also update Discord channel embed if client is provided
        if (client) {
          await this.updateStatusEmbed(client, statusData);
        }
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
          uptime: client.uptime?.toString() || "0"
        });
      }).catch(() => {
        // Fallback to cached users if fetch fails
        this.updateStatus({
          botId,
          name: botName,
          servers: client.guilds.cache.size,
          users: client.users.cache.size,
          online: true,
          uptime: client.uptime?.toString() || "0"
        });
      });
    } else {
      this.updateStatus({
        botId,
        name: botName,
        servers: client.guilds.cache.size,
        users: client.users.cache.size,
        online: true,
        uptime: client.uptime?.toString() || "0"
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
              uptime: client.uptime?.toString() || "0"
            });
          }).catch(() => {
            // Fallback to cached users if fetch fails
            this.updateStatus({
              botId,
              name: botName,
              servers: client.guilds.cache.size,
              users: client.users.cache.size,
              online: true,
              uptime: client.uptime?.toString() || "0"
            });
          });
        } else {
          this.updateStatus({
            botId,
            name: botName,
            servers: client.guilds.cache.size,
            users: client.users.cache.size,
            online: true,
            uptime: client.uptime?.toString() || "0"
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

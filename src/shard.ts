import { ShardingManager } from "discord.js";
import { env } from "./env";
import type Logger from "./structures/Logger";
import { BotStatusReporter } from "./utils/BotStatusReporter";

export async function shardStart(logger: Logger) {
	const manager = new ShardingManager("./dist/LavaClient.js", {
		respawn: true,
		token: env.TOKEN,
		totalShards: "auto",
		shardList: "auto",
	});

	let lastOnlineStatus = true;

	manager.on("shardCreate", (shard) => {
		shard.on("ready", () => {
			logger.start(
				`[CLIENT] Shard ${shard.id} connected to Discord's Gateway.`,
			);
			lastOnlineStatus = true;
		});

		// Listen for shard disconnect
		shard.on("death", () => {
			logger.warn(`[BOT STATUS] Shard ${shard.id} died/disconnected`);
			if (lastOnlineStatus) {
				lastOnlineStatus = false;
				BotStatusReporter.updateStatus({
					botId: env.CLIENT_ID || "",
					name: "Novara Music",
					servers: 0,
					users: 0,
					online: false,
				}).catch(err => logger.error("[BOT STATUS] Failed to send offline status:", err));
			}
		});
	});

	await manager.spawn();

	logger.start(`[CLIENT] ${manager.totalShards} shard(s) spawned.`);

	// Handle manager shutdown
	const sendOfflineStatus = async () => {
		logger.warn("[BOT STATUS] Sending offline status before exit");
		try {
			const result = await BotStatusReporter.updateStatus({
				botId: env.CLIENT_ID || "",
				name: "Novara Music",
				servers: 0,
				users: 0,
				online: false,
			});
			if (result) {
				logger.warn("[BOT STATUS] ✅ Offline status sent successfully to API");
			} else {
				logger.warn("[BOT STATUS] ⚠️ Offline status returned false");
			}
		} catch (err) {
			logger.error("[BOT STATUS] ❌ Failed to send offline status:", err);
		}
	};

	// Handle process signals - MUST use process.on before manager spawns
	process.on("SIGINT", async () => {
		logger.warn("[BOT STATUS] SIGINT received - sending offline and exiting");
		try {
			await sendOfflineStatus();
		} catch (err) {
			logger.error("[BOT STATUS] Error sending offline status:", err);
		}
		logger.warn("[BOT STATUS] Waiting 2 seconds before exit");
		await new Promise(resolve => setTimeout(resolve, 2000));
		BotStatusReporter.stopAutoUpdate();
		logger.warn("[BOT STATUS] Exiting now");
		process.exit(0);
	});

	process.on("SIGTERM", async () => {
		logger.warn("[BOT STATUS] SIGTERM received - sending offline and exiting");
		try {
			await sendOfflineStatus();
		} catch (err) {
			logger.error("[BOT STATUS] Error sending offline status:", err);
		}
		logger.warn("[BOT STATUS] Waiting 2 seconds before exit");
		await new Promise(resolve => setTimeout(resolve, 2000));
		BotStatusReporter.stopAutoUpdate();
		logger.warn("[BOT STATUS] Exiting now");
		process.exit(0);
	});

	// Handle uncaught exceptions as graceful shutdown
	process.on("uncaughtException", async (error) => {
		logger.error("[BOT STATUS] Uncaught exception - sending offline status:", error);
		try {
			await sendOfflineStatus();
		} catch (err) {
			logger.error("[BOT STATUS] Failed to send offline on exception:", err);
		}
		logger.warn("[BOT STATUS] Exiting after exception");
		process.exit(1);
	});

	// Windows console close event (Ctrl+C in console)
	if (process.platform === "win32") {
		const readline = require("readline");
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		rl.on("SIGINT", async () => {
			logger.warn("[BOT STATUS] Windows Ctrl+C detected - triggering graceful shutdown");
			await sendOfflineStatus();
			logger.warn("[BOT STATUS] Waiting 3 seconds before exit");
			await new Promise(resolve => setTimeout(resolve, 3000));
			process.exit(0);
		});
	}
}


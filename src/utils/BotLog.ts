import type { TextChannel } from "discord.js";
import type { Lavamusic } from "../structures/index";

export async function sendLog(
	client: Lavamusic,
	message: string,
	type: "error" | "warn" | "info" | "success" = "info",
): Promise<void> {
	if (!client?.env.LOG_CHANNEL_ID) {
		console.error(`[LOG] LOG_CHANNEL_ID missing in environment.`);
		return;
	}

	let channel;
	try {
		channel = await client.channels.fetch(client.env.LOG_CHANNEL_ID);
	} catch (err) {
		console.error(`[LOG] Failed to fetch log channel from Discord API: ${client.env.LOG_CHANNEL_ID}`, err);
		return;
	}

	if (!channel) {
		console.error(`[LOG] Log channel not found: ${client.env.LOG_CHANNEL_ID}`);
		return;
	}
	if (!("send" in channel)) {
		console.error(`[LOG] Channel is not text-based: ${client.env.LOG_CHANNEL_ID}`);
		return;
	}
	const botUserId = client.user?.id;
	if (!("permissionsFor" in channel) || !botUserId || !channel.permissionsFor(botUserId)?.has(["ViewChannel", "SendMessages", "EmbedLinks"])) {
		console.error(`[LOG] Missing permissions in log channel: ${client.env.LOG_CHANNEL_ID}`);
		return;
	}
	const colors = {
		error: 0xff0000,
		warn: 0xffff00,
		info: 0x00ff00,
		success: 0x00ff00,
	} as const;

	const color = colors[type];
	const embed = client
		.embed()
		.setColor(color)
		.setDescription(message)
		.setTimestamp();

	(channel as TextChannel).send({ embeds: [embed] }).catch((err) => {
		console.error(`[LOG] Failed to send log message:`, err);
	});
}


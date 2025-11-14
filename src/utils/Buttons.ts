import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type ComponentEmojiResolvable,
} from "discord.js";
import type { Player } from "lavalink-client";
import type { Lavamusic } from "../structures/index";

function getButtons(
	player: Player,
	client: Lavamusic,
): ActionRowBuilder<ButtonBuilder>[] {
	// Get loop emoji based on current repeat mode
	const getLoopEmoji = (): string => {
		if (!player) return client.emoji.loop.none;
		if (player.repeatMode === "track") return client.emoji.loop.track;
		if (player.repeatMode === "queue") return client.emoji.loop.none; // Use none emoji for queue
		return client.emoji.loop.none;
	};

	// Get autoplay state
	const autoplay = player?.get<boolean>("autoplay") ?? false;

	// Helper function to format emoji
	const formatEmoji = (emoji: string): ComponentEmojiResolvable => {
		if (typeof emoji === "string" && emoji.startsWith("<:")) {
			const match = emoji.match(/^<:\w+:(\d+)>$/);
			return (match ? match[1] : emoji) as ComponentEmojiResolvable;
		}
		return emoji as ComponentEmojiResolvable;
	};

	const rows: ActionRowBuilder<ButtonBuilder>[] = [];

	// First row: 5 emoji-only buttons (Previous, Pause, Skip, Loop, Shuffle)
	const firstRow = new ActionRowBuilder<ButtonBuilder>();
	firstRow.addComponents(
		new ButtonBuilder()
			.setCustomId("PREV_BUT")
			.setEmoji(formatEmoji(client.emoji.previous))
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId("PAUSE_BUT")
			.setEmoji(formatEmoji(player?.paused ? client.emoji.resume : client.emoji.pause))
			.setStyle(player?.paused ? ButtonStyle.Success : ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId("SKIP_BUT")
			.setEmoji(formatEmoji(client.emoji.skip))
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId("LOOP_BUT")
			.setEmoji(formatEmoji(getLoopEmoji()))
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId("SHUFFLE_BUT")
			.setEmoji(formatEmoji(client.emoji.shuffle))
			.setStyle(ButtonStyle.Secondary),
	);
	rows.push(firstRow);

	// Second row: Stop button (emoji-only) + Autoplay button (with text)
	const secondRow = new ActionRowBuilder<ButtonBuilder>();
	secondRow.addComponents(
		new ButtonBuilder()
			.setCustomId("STOP_BUT")
			.setEmoji(formatEmoji(client.emoji.stop))
			.setStyle(ButtonStyle.Danger),
		new ButtonBuilder()
			.setCustomId("AUTOPLAY_BUT")
			.setEmoji(formatEmoji(autoplay ? "✅" : "❌"))
			.setStyle(autoplay ? ButtonStyle.Success : ButtonStyle.Secondary)
			.setLabel(autoplay ? "Autoplay: ON" : "Autoplay: OFF"),
	);
	rows.push(secondRow);

	return rows;
}

export { getButtons };


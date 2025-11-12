import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type EmojiIdentifierResolvable,
} from "discord.js";
import type { Player } from "lavalink-client";
import type { Lavamusic } from "../structures/index";

function getButtons(
	player: Player,
	client: Lavamusic,
): ActionRowBuilder<ButtonBuilder>[] {
	const buttonData = [
		{
			customId: "PREV_BUT",
			emoji: client.emoji.previous,
			style: ButtonStyle.Secondary,
			label: "Previous",
		},
		{
			customId: "REWIND_BUT",
			emoji: client.emoji.rewind,
			style: ButtonStyle.Secondary,
			label: "Rewind 10s",
		},
		{
			customId: "PAUSE_BUT",
			emoji: player?.paused ? client.emoji.resume : client.emoji.pause,
			style: player?.paused ? ButtonStyle.Success : ButtonStyle.Primary,
			label: player?.paused ? "Resume" : "Pause",
		},
		{
			customId: "FORWARD_BUT",
			emoji: client.emoji.forward,
			style: ButtonStyle.Secondary,
			label: "Forward 10s",
		},
		{
			customId: "SKIP_BUT",
			emoji: client.emoji.skip,
			style: ButtonStyle.Primary,
			label: "Skip",
		},
		{
			customId: "LOW_VOL_BUT",
			emoji: client.emoji.voldown,
			style: ButtonStyle.Secondary,
			label: "Volume -",
		},
		{
			customId: "LOOP_BUT",
			emoji: client.emoji.loop.none,
			style: ButtonStyle.Secondary,
			label: "Loop",
		},
		{
			customId: "STOP_BUT",
			emoji: client.emoji.stop,
			style: ButtonStyle.Danger,
			label: "Stop",
		},
		{
			customId: "SHUFFLE_BUT",
			emoji: client.emoji.shuffle,
			style: ButtonStyle.Secondary,
			label: "Shuffle",
		},
		{
			customId: "HIGH_VOL_BUT",
			emoji: client.emoji.volup,
			style: ButtonStyle.Secondary,
			label: "Volume +",
		},
	];

	return buttonData.reduce((rows, { customId, emoji, style, label }, index) => {
		if (index % 5 === 0) rows.push(new ActionRowBuilder<ButtonBuilder>());

		let emojiFormat: EmojiIdentifierResolvable;
		if (typeof emoji === "string" && emoji.startsWith("<:")) {
			const match = emoji.match(/^<:\w+:(\d+)>$/);
			emojiFormat = match ? match[1] : emoji;
		} else {
			emojiFormat = emoji;
		}

		const button = new ButtonBuilder()
			.setCustomId(customId)
			.setEmoji(emojiFormat)
			.setStyle(style)
			.setLabel(label);
		rows[rows.length - 1].addComponents(button);
		return rows;
	}, [] as ActionRowBuilder<ButtonBuilder>[]);
}

export { getButtons };


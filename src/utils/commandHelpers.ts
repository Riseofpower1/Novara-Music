/**
 * Common command configuration helpers to reduce duplication
 */

import type { CooldownConfig } from "./cooldownManager";

/**
 * Standard client permissions for most commands
 */
export const STANDARD_CLIENT_PERMISSIONS = [
	"SendMessages",
	"ReadMessageHistory",
	"ViewChannel",
	"EmbedLinks",
] as const;

/**
 * Client permissions for music commands (includes voice permissions)
 */
export const MUSIC_CLIENT_PERMISSIONS = [
	...STANDARD_CLIENT_PERMISSIONS,
	"Connect",
	"Speak",
] as const;

/**
 * Standard player configuration for non-music commands
 */
export const NO_PLAYER_CONFIG = {
	voice: false,
	dj: false,
	active: false,
	djPerm: null,
} as const;

/**
 * Standard player configuration for music commands that require voice
 */
export const VOICE_PLAYER_CONFIG = {
	voice: true,
	dj: false,
	active: false,
	djPerm: null,
} as const;

/**
 * Standard player configuration for music commands that require active player
 */
export const ACTIVE_PLAYER_CONFIG = {
	voice: true,
	dj: false,
	active: true,
	djPerm: null,
} as const;

/**
 * Standard player configuration for music commands that require active player and DJ
 */
export const ACTIVE_DJ_PLAYER_CONFIG = {
	voice: true,
	dj: true,
	active: true,
	djPerm: null,
} as const;

/**
 * Standard player configuration for commands that require active player but no voice
 */
export const ACTIVE_NO_VOICE_CONFIG = {
	voice: false,
	dj: false,
	active: true,
	djPerm: null,
} as const;

/**
 * Standard player configuration for commands that require voice and DJ but not active
 */
export const VOICE_DJ_PLAYER_CONFIG = {
	voice: true,
	dj: true,
	active: false,
	djPerm: null,
} as const;

/**
 * Helper to create standard command permissions
 */
export function createCommandPermissions(
	userPermissions: string[] = [],
	devOnly: boolean = false,
): {
	dev: boolean;
	client: import("discord.js").PermissionResolvable;
	user: import("discord.js").PermissionResolvable;
} {
	return {
		dev: devOnly,
		client: [...STANDARD_CLIENT_PERMISSIONS] as import("discord.js").PermissionResolvable,
		user: userPermissions as import("discord.js").PermissionResolvable,
	};
}

/**
 * Helper to create music command permissions
 */
export function createMusicCommandPermissions(
	userPermissions: string[] = [],
	devOnly: boolean = false,
): {
	dev: boolean;
	client: import("discord.js").PermissionResolvable;
	user: import("discord.js").PermissionResolvable;
} {
	return {
		dev: devOnly,
		client: [...MUSIC_CLIENT_PERMISSIONS] as import("discord.js").PermissionResolvable,
		user: userPermissions as import("discord.js").PermissionResolvable,
	};
}

/**
 * Helper to create music command permissions with additional permissions (e.g., AttachFiles)
 */
export function createMusicCommandPermissionsWithExtra(
	extraPermissions: string[],
	userPermissions: string[] = [],
	devOnly: boolean = false,
): {
	dev: boolean;
	client: import("discord.js").PermissionResolvable;
	user: import("discord.js").PermissionResolvable;
} {
	return {
		dev: devOnly,
		client: [...MUSIC_CLIENT_PERMISSIONS, ...extraPermissions] as import("discord.js").PermissionResolvable,
		user: userPermissions as import("discord.js").PermissionResolvable,
	};
}

/**
 * Convert legacy cooldown (number) to CooldownConfig
 */
export function normalizeCooldown(
	cooldown: number | CooldownConfig | undefined,
): CooldownConfig {
	if (typeof cooldown === "number") {
		return {
			scope: "user",
			duration: cooldown,
		};
	}
	if (cooldown && typeof cooldown === "object") {
		return cooldown;
	}
	return {
		scope: "user",
		duration: 3,
	};
}

/**
 * Helper to create command permissions with additional client permissions
 */
export function createCommandPermissionsWithExtra(
	extraPermissions: string[],
	userPermissions: string[] = [],
	devOnly: boolean = false,
): {
	dev: boolean;
	client: import("discord.js").PermissionResolvable;
	user: import("discord.js").PermissionResolvable;
} {
	return {
		dev: devOnly,
		client: [...STANDARD_CLIENT_PERMISSIONS, ...extraPermissions] as import("discord.js").PermissionResolvable,
		user: userPermissions as import("discord.js").PermissionResolvable,
	};
}

/**
 * Helper to create standard embed with common styling
 */
export function createStandardEmbed(client: { embed: () => import("discord.js").EmbedBuilder; color: { main: number } }, color?: number) {
	return client
		.embed()
		.setColor(color || client.color.main);
}

/**
 * Helper to create error embed
 */
export function createErrorEmbed(client: { embed: () => import("discord.js").EmbedBuilder; color: { red: number } }, message: string) {
	return client
		.embed()
		.setColor(client.color.red)
		.setDescription(message);
}

/**
 * Helper to create success embed
 */
export function createSuccessEmbed(client: { embed: () => import("discord.js").EmbedBuilder; color: { main: number } }, message: string) {
	return client
		.embed()
		.setColor(client.color.main)
		.setDescription(message);
}


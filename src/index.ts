import { shardStart } from "./shard";
import Logger from "./structures/Logger";
import { ThemeSelector } from "./utils/ThemeSelector";

const logger = new Logger();

const theme = new ThemeSelector();

/**
 * Sets the console window title.
 * @param title - The new title for the console window.
 */
function setConsoleTitle(title: string): void {
	// Write the escape sequence to change the console title
	process.stdout.write(`\x1b]0;${title}\x07`);
}

try {
	console.clear();
	// Set a custom title for the console window
	setConsoleTitle("Novara Music");
	console.log(theme.purpleNeon("🎵 Novara Music Bot Starting..."));
	shardStart(logger);
} catch (err) {
	logger.error("[CLIENT] An error has occurred:", err);
}


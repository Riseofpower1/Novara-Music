import type { LavalinkNode } from "lavalink-client";
import { Event, type Lavamusic } from "../../structures/index";
import { sendLog } from "../../utils/BotLog";
import { APIError, handleError } from "../../utils/errors";

export default class ErrorEvent extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: "error",
		});
	}

	public async run(node: LavalinkNode, error: Error): Promise<void> {
		const lavalinkError = new APIError(
			`Lavalink node error: ${error.message}`,
			"Lavalink",
			undefined,
			true, // Retryable
			{
				nodeId: node.id,
				nodeHost: node.options?.host || "unknown",
				stack: error.stack,
			},
		);

		handleError(lavalinkError, {
			client: this.client,
			additionalContext: {
				operation: "lavalink_node_error",
				nodeId: node.id,
			},
		});

		// Also send to log channel
		await sendLog(
			this.client,
			`Node ${node.id} encountered an error: ${error.stack || error.message}`,
			"error",
		).catch((logError) => {
			this.client.logger.error("Failed to send node error to log channel:", logError);
		});
	}
}

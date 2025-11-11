import { env } from "../../env";
import { Event, type Lavamusic } from "../../structures/index";
import { Events } from "discord.js";

export default class Ready extends Event {
	constructor(client: Lavamusic, file: string) {
		super(client, file, {
			name: Events.ClientReady,
		});
	}

	public async run(): Promise<void> {
		this.client.logger.success(`${this.client.user?.tag} is ready!`);

		this.client.user?.setPresence({
			activities: [
				{
					name: env.BOT_ACTIVITY,
					type: env.BOT_ACTIVITY_TYPE,
				},
			],
			status: env.BOT_STATUS as any,
		});

		await this.client.manager.init({ ...this.client.user!, shards: "auto" });
	}
}


import { Client } from '../../deps.ts';

export class Server {
	private client: Client | null = null;

	constructor(connectionString?: string) {
		if (connectionString) {
			this.client = new Client(connectionString);
		}
	}

	public async connect(connectionString?: string) {
		const maxRetries = 3;
		let currentAttempt = 0;

		while (currentAttempt < maxRetries) {
			try {
				const connection = Deno.env.get('POSTGRES') || connectionString;
				if (!connection) {
					throw new Error(
						'Connection string not found \n Please set the POSTGRES environment variable or pass the connection string as an argument',
					);
				}

				console.log('connecting', connection);
				this.client = new Client(connection);
				await this.client.connect();
				console.log('connected');
				return this.client;
			} catch (error) {
				currentAttempt++;
				console.log(
					`Attempt ${currentAttempt} failed: ${error.message}`,
				);

				if (currentAttempt >= maxRetries) {
					throw new Error(
						`Could not connect to the server after ${maxRetries} attempts: ${error.message}`,
					);
				}

				// Wait for 1 second before the next attempt
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}
	}

	public async close() {
		if (this.client) {
			await this.client.end();
		}
	}

	// Additional methods for query execution can be added here
}

import {
  pgconnect,
  PgConnection,
} from "https://raw.githubusercontent.com/kagis/pgwire/main/mod.js";

export class Server {
  private pg: PgConnection | null = null;
  constructor() {}

  public async connect(connectionString?: string) {
    const maxRetries = 3;
    let currentAttempt = 0;

    while (currentAttempt < maxRetries) {
      try {
        // Attempt to connect
        const connection = Deno.env.get("POSTGRES") || connectionString;
        if (!connection) {
          throw new Error(
            "Connection string not found \n Please set the POSTGRES environment variable or pass the connection string as an argument",
          );
        }
        console.log("connecting", connection);
        this.pg = await pgconnect(connection);
        console.log("connected");
        return this.pg;
      } catch (error) {
        currentAttempt++;
        console.log(`Attempt ${currentAttempt} failed: ${error.message}`);

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
    if (this.pg) {
      await this.pg.end();
    }
  }
}

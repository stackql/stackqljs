import {
  pgconnect,
  PgConnection,
} from "https://raw.githubusercontent.com/kagis/pgwire/main/mod.js";

export class Server {
  private pg: PgConnection | null = null;
  constructor() {}

  public async connect(connectionString?: string) {
    try {
      // Good practice is to get the connection URI from an environment variable
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
      throw new Error(`Could not connect to the server: ${error.message}`);
    }
  }

  public async close() {
    if (this.pg) {
      await this.pg.end();
    }
  }
}

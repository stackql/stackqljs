import { assertExists } from "https://deno.land/std@0.206.0/assert/assert_exists.ts";
import { Downloader } from "./services/downloader.ts";
import { fileExists } from "./utils.ts";
import { Server } from "./services/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/client.ts";
import {
  QueryArrayResult,
  QueryObjectResult,
} from "https://deno.land/x/postgres@v0.17.0/query/query.ts";

export interface StackQLConfig {
  binaryPath?: string;
  serverMode?: boolean;
  connectionString?: string;
}

export class StackQL {
  private binaryPath?: string;
  private downloader: Downloader = new Downloader();
  private serverMode = false;
  private connection?: Client; //TODO: wrap connection into Server class
  private format: "object" = "object";
  constructor() {
  }
  public async initialize(config: StackQLConfig) {
    this.binaryPath = config.binaryPath;
    this.serverMode = config.serverMode || false;
    if (this.serverMode) {
      await this.setupConnection(config.connectionString);
      return;
    }
    if (this.binaryPath && fileExists(this.binaryPath)) {
      return;
    }
    this.binaryPath = await this.downloader.setupStackQL();
  }

  private async setupConnection(connectionString?: string) {
    const server = new Server();
    this.connection = await server.connect(connectionString);
  }

  public async closeConnection() {
    if (this.connection) {
      await this.connection.end();
    }
  }

  public async runQuery(query: string) {
    assertExists(this.binaryPath);
    const process = new Deno.Command(this.binaryPath, {
      args: ["exec", query], // Ensure this command is correct
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await process.output();

    if (code === 0) {
      const output = stdout;
      const result = new TextDecoder().decode(output);
      return result;
    } else {
      const errorOutput = stderr;
      const errorMessage = new TextDecoder().decode(errorOutput);
      throw new Error(`StackQL query failed: ${errorMessage}`);
    }
  }

  private async queryObjectFormat(query: string) {
    assertExists(this.connection);
    const pgResult = await this.connection.queryObject(query);
    return pgResult.rows;
  }

  public async runServerQuery(query: string) {
    try {
      if (this.format === "object") {
        const result = await this.queryObjectFormat(query);
        return result;
      }
    } catch (error) {
      console.error(error);
      throw new Error(`StackQL server query failed: ${error.message}`);
    }
  }
}

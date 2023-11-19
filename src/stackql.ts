import { assertExists } from "https://deno.land/std@0.206.0/assert/assert_exists.ts";
import { Downloader } from "./services/downloader.ts";
import { fileExists } from "./utils/os.ts";
import { Server } from "./services/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/client.ts";
import { formatAuth } from "./utils/auth.ts";

export interface StackQLConfig {
  binaryPath?: string;
  serverMode?: boolean;
  connectionString?: string;
  customAuth?: string | object;
}

export class StackQL {
  private binaryPath?: string;
  private downloader: Downloader = new Downloader();
  private serverMode = false;
  private connection?: Client; //TODO: wrap connection into Server class
  private format: "object" = "object";
  private params: string[] = [];
  constructor() {
  }
  public async initialize(config: StackQLConfig) {
    this.binaryPath = config.binaryPath;
    this.serverMode = config.serverMode || false;
    if (this.serverMode) {
      await this.setupConnection(config.connectionString);
      return;
    }
    this.setupParams(config);
    if (this.binaryPath && fileExists(this.binaryPath)) {
      return;
    }
    this.binaryPath = await this.downloader.setupStackQL();
  }

  private setupParams(config: StackQLConfig) {
    if (config.customAuth) {
      this.setAuth(config.customAuth);
    }
  }

  private setAuth(auth: string | object) {
    const { authStr } = formatAuth(auth);
    this.params.push(`--auth=${authStr}`);
    // this.params.push(authStr);
  }

  public async runQuery(query: string) {
    assertExists(this.binaryPath);
    const args = ["exec", query].concat(this.params);
    console.log("args", args);
    const process = new Deno.Command(this.binaryPath, {
      args,
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
  //////////////////////Server mode related methods
  private async queryObjectFormat(query: string) {
    assertExists(this.connection);
    const pgResult = await this.connection.queryObject(query);
    return pgResult.rows;
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

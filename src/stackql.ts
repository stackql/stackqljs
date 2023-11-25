import { assertExists } from "https://deno.land/std@0.206.0/assert/assert_exists.ts";
import { Downloader } from "./services/downloader.ts";
import osUtils from "./utils/os.ts";
import { Server } from "./services/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/client.ts";

export interface StackQLConfig {
  binaryPath?: string;
  serverMode?: boolean;
  connectionString?: string;
  maxResults?: number;
  pageLimit?: number;
  maxDepth?: number;
  apiTimeout?: number;
}

export class StackQL {
  private binaryPath?: string;
  private downloader: Downloader = new Downloader(); //TODO: Change to DI
  private serverMode = false;
  private connection?: Client; //TODO: wrap connection into Server class
  private format: "object" = "object";
  private params: string[] = [];
  constructor() {
  }

  getParams() {
    return this.params;
  }

  getBinaryPath() {
    return this.binaryPath;
  }

  public async initialize(config: StackQLConfig) {
    this.binaryPath = config.binaryPath;
    this.serverMode = config.serverMode || false;
    if (this.serverMode) {
      await this.setupConnection(config.connectionString);
      return;
    }
    if (this.binaryExist()) {
      return;
    }
    this.binaryPath = await this.downloader.setupStackQL();
    this.setProperties(config);
  }
  private binaryExist() {
    return !!this.binaryPath && osUtils.fileExists(this.binaryPath);
  }

  private setProperties(config: StackQLConfig): void {
    if (config.maxResults !== undefined) {
      this.params.push("--http.response.maxResults");
      this.params.push(config.maxResults.toString());
    }

    if (config.pageLimit !== undefined) {
      this.params.push("--http.response.pageLimit");
      this.params.push(config.pageLimit.toString());
    }

    if (config.maxDepth !== undefined) {
      this.params.push("--indirect.depth.max");
      this.params.push(config.maxDepth.toString());
    }

    this.params.push("--apirequesttimeout");
    if (config.apiTimeout !== undefined) {
      this.params.push(config.apiTimeout.toString());
    }
  }

  public async runQuery(query: string) {
    assertExists(this.binaryPath);
    const args = ["exec", query].concat(this.params);
    try {
      const result = await osUtils.runCli(this.binaryPath, args);
      return result;
    } catch (error) {
      console.error(error);
      throw new Error(`StackQL query failed: ${error.message}`);
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

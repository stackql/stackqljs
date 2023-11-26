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
  proxyHost?: string;
  proxyPort?: number;
  proxyUser?: string;
  proxyPassword?: string;
  proxyScheme?: "http" | "https";
}

export class StackQL {
  private binaryPath?: string; //The full path of the `stackql` executable (not supported in `server_mode`).
  private downloader: Downloader = new Downloader();
  private serverMode = false;
  private connection?: Client;
  private format: "object" = "object";
  private params: string[] = [];
  private version: string | undefined; // The version number of the `stackql` executable (not supported in `server_mode`)
  private sha: string | undefined; // The commit (short) sha for the installed `stackql` binary build  (not supported in `server_mode`).
  constructor() {
  }

  getParams() {
    return this.params;
  }

  getBinaryPath() {
    return this.binaryPath;
  }

  async getVersion() {
    if (!this.version) {
      await this.updateVersion();
    }

    return { version: this.version, sha: this.sha };
  }

  private async updateVersion() {
    if (!this.binaryPath) {
      throw new Error("Binary path not found");
    }
    const output = await osUtils.runCommand(this.binaryPath, ["--version"]);
    if (output) {
      const versionTokens: string[] = output.split("\n")[0].split(" ");
      const version: string = versionTokens[1];
      const sha: string = versionTokens[3].replace("(", "").replace(")", "");

      this.version = version;
      this.sha = sha;
    }
  }
  async upgrade() {
    this.binaryPath = await this.downloader.upgradeStackQL();
    await this.updateVersion();
    return this.getVersion();
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
  private setProxyProperties(config: StackQLConfig): void {
    if (config.proxyHost !== undefined) {
      this.params.push("--http.proxy.host");
      this.params.push(config.proxyHost);
    }

    if (config.proxyPort !== undefined) {
      this.params.push("--http.proxy.port");
      this.params.push(config.proxyPort.toString());
    }

    if (config.proxyUser !== undefined) {
      this.params.push("--http.proxy.user");
      this.params.push(config.proxyUser);
    }

    if (config.proxyPassword !== undefined) {
      this.params.push("--http.proxy.password");
      this.params.push(config.proxyPassword);
    }

    if (config.proxyScheme !== undefined) {
      if (!["http", "https"].includes(config.proxyScheme)) {
        throw new Error(
          `Invalid proxyScheme. Expected one of ['http', 'https'], got ${config.proxyScheme}.`,
        );
      }
      this.params.push("--http.proxy.scheme");
      this.params.push(config.proxyScheme);
    }
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

    if (config.apiTimeout !== undefined) {
      this.params.push("--apirequesttimeout");
      this.params.push(config.apiTimeout.toString());
    }

    if (config.proxyHost !== undefined) {
      this.setProxyProperties(config);
    }
  }

  public async runQuery(query: string) {
    assertExists(this.binaryPath);
    const args = ["exec", query].concat(this.params);
    try {
      const result = await osUtils.runCommand(this.binaryPath, args);
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

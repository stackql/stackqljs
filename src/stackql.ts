import { assertExists } from "https://deno.land/std@0.206.0/assert/assert_exists.ts";
import { Downloader } from "./services/downloader.ts";

export class StackQL {
  private binaryPath?: string;
  private downloader: Downloader = new Downloader();
  constructor() {}
  private async initialize() {
    this.binaryPath = await this.downloader.setupStackQL();
  }

  public async runQuery(query: string) {
    if (!this.binaryPath) {
      await this.initialize();
      assertExists(this.binaryPath);
    }

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
}

import { join } from "https://deno.land/std@0.133.0/path/mod.ts";
import { SupportedOs } from "../types/platforms.ts";
import { darwinUnpack, unzip } from "./unpacker.ts";

export class Downloader {
  private os: string;
  private arch: string;
  private urlMap: Record<string, string>;

  constructor() {
    this.os = Deno.build.os; // 'linux', 'darwin', or 'windows'
    this.arch = Deno.build.arch; // 'x86_64', 'arm64', etc.

    this.urlMap = {
      [SupportedOs.Linux]:
        "https://releases.stackql.io/stackql/latest/stackql_linux_amd64.zip",
      [SupportedOs.Windows]:
        "https://releases.stackql.io/stackql/latest/stackql_windows_amd64.zip",
      [SupportedOs.Darwin]:
        "https://storage.googleapis.com/stackql-public-releases/latest/stackql_darwin_multiarch.pkg",
      // Additional OS-architecture combinations can be added here
    };
  }

  private async downloadFile(url: string, downloadDir: string) {
    const res = await fetch(url);
    const file = await Deno.open(downloadDir, { create: true, write: true });

    try {
      await res.body?.pipeTo(file.writable).finally(
        () => file.close() //TODO: fix bad resource id when closing file
      );
    } catch (error) {
      console.error(`ERROR: [downloadFile] ${error.message}`);
    }

    console.log("Closed file");
  }

  private getUrl(): string {
    const key = `${this.os}`;
    const url = this.urlMap[key];

    if (!url) {
      throw new Error(`Unsupported OS type: ${this.os}`);
    }

    return url;
  }

  /**
   * Gets binary name
   * @returns  binrary name
   */
  private getBinaryName() {
    const binaryMap: Record<SupportedOs, string> = {
      [SupportedOs.Windows]: "stackql.exe",
      [SupportedOs.Darwin]: "stackql/Payload/stackql",
      [SupportedOs.Linux]: "stackql", // Default case for Linux and other platforms
    };
    const os = Deno.build.os.toLowerCase();

    if (!Object.values(SupportedOs).includes(os as SupportedOs)) {
      throw new Error(`Unsupported OS type: ${os}`);
    }

    const binaryOs = os as SupportedOs;
    return binaryMap[binaryOs];
  }

  /**
   * Gets download dir
   * @returns download dir
   */
  private async getDownloadDir(): Promise<string> {
    const projectDir = Deno.cwd();
    console.log("Project dir:", projectDir);

    if (!projectDir) {
      throw new Error("Unable to determine the project directory.");
    }

    const downloadDir = join(projectDir, ".stackql");

    try {
      const stat = await Deno.stat(downloadDir);
      if (!stat.isDirectory) {
        await Deno.mkdir(downloadDir, { recursive: true });
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        await Deno.mkdir(downloadDir, { recursive: true });
      } else {
        throw error;
      }
    }

    return downloadDir;
  }

  private binaryExists(binaryName: string, downloadDir: string): boolean {
    const binPath = join(downloadDir, binaryName);
    try {
      Deno.statSync(binPath);
      return true;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Setup stackql binary, check if binary exists, if not download it
   */
  public async setupStackQL() {
    console.log("Installing stackql...");

    try {
      const binaryName = this.getBinaryName();
      const url = this.getUrl();
      const downloadDir = await this.getDownloadDir();
      const allowExecOctal = 0o755;
      if (this.binaryExists(binaryName, downloadDir)) {
        console.log("stackql is already installed");
        const binaryPath = join(downloadDir, binaryName);
        Deno.chmodSync(binaryPath, allowExecOctal);
        return binaryPath;
      }

      console.log("Downloading stackql binary");
      const archiveFileName = `${downloadDir}/${url.split("/").pop()}`;
      await this.downloadFile(url, archiveFileName);

      console.log("Unpacking stackql binary");
      const unpacker = Deno.build.os === "darwin" ? darwinUnpack : unzip;
      await unpacker({ downloadDir, archiveFileName });
      const binaryPath = join(downloadDir, binaryName);
      Deno.chmodSync(binaryPath, allowExecOctal);
      return binaryPath;
    } catch (error) {
      console.error(`ERROR: [setup] ${error.message}`);
      Deno.exit(1);
    }
  }
}

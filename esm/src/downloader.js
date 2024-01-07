import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import https from "https";
import util from "util";
import extract from "extract-zip";
const execPromise = util.promisify(exec);

// Supported Operating Systems
const SupportedOs = {
  Linux: "linux",
  Windows: "windows",
  Darwin: "darwin",
};

class Downloader {
  constructor() {
    this.os = process.platform; // 'linux', 'darwin', or 'win32'
    this.arch = process.arch; // 'x64', 'arm64', etc.

    this.urlMap = {
      [SupportedOs.Linux]:
        "https://releases.stackql.io/stackql/latest/stackql_linux_amd64.zip",
      [SupportedOs.Windows]:
        "https://releases.stackql.io/stackql/latest/stackql_windows_amd64.zip",
      [SupportedOs.Darwin]:
        "https://storage.googleapis.com/stackql-public-releases/latest/stackql_darwin_multiarch.pkg",
    };
  }

  /**
   *
   * @param {string} url
   * @param {string} downloadDir
   * @returns
   */
  async downloadFile(url, downloadDir) {
    const file = fs.createWriteStream(downloadDir);
    return new Promise((resolve, reject) => {
      https
        .get(url, (response) => {
          response.pipe(file);
          file.on("finish", () => {
            file.close(resolve);
          });
        })
        .on("error", (err) => {
          fs.unlink(downloadDir);
          reject(err);
        });
    });
  }

  /**
   * @returns {string} URL for the current OS.
   */
  getUrl() {
    const key = this.os === "win32" ? SupportedOs.Windows : this.os;
    const url = this.urlMap[key];
    if (!url) {
      throw new Error(`Unsupported OS type: ${this.os}`);
    }
    return url;
  }

  /**
   * @returns {string} Name of the binary for the current OS.
   */
  getBinaryName() {
    const binaryMap = {
      [SupportedOs.Windows]: "stackql.exe",
      [SupportedOs.Darwin]: "stackql/Payload/stackql",
      [SupportedOs.Linux]: "stackql",
    };
    return binaryMap[this.os] || "stackql";
  }

  /**
   * Creates a download directory if it does not exist.
   * @param {string} downloadDir
   */
  async createDownloadDir(downloadDir) {
    try {
      await fs.mkdir(downloadDir, { recursive: true });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
  }

  /**
   * Checks if the binary exists in the download directory.
   * @param {string} binaryName
   * @param {string} downloadDir
   * @returns {boolean}
   */
  async binaryExists(binaryName, downloadDir) {
    try {
      await fs.access(path.join(downloadDir, binaryName));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Installs stackql.
   * @param {string} downloadDir
   */
  async installStackQL(downloadDir) {
    const url = this.getUrl();
    const archiveFileName = path.join(downloadDir, path.basename(url));
    await this.downloadFile(url, archiveFileName);
    console.log("Unpacking stackql binary");

    if (this.os === SupportedOs.Darwin) {
      await darwinUnpack({ downloadDir, archiveFileName });
    } else {
      await extract(archiveFileName, { dir: downloadDir });
    }
  }

  async setExecutable(binaryPath) {
    await fs.chmod(binaryPath, 0o755);
  }

  async downloadAndInstallStackQL(downloadDir, binaryName) {
    const binaryPath = path.join(downloadDir, binaryName);
    await this.installStackQL(downloadDir);
    await this.setExecutable(binaryPath);
    return binaryPath;
  }

  async setupStackQL() {
    try {
      const binaryName = this.getBinaryName();
      const downloadDir = path.join(process.cwd(), ".stackql");
      await this.createDownloadDir(downloadDir);

      let binaryPath = path.join(downloadDir, binaryName);

      if (await this.binaryExists(binaryName, downloadDir)) {
        await this.setExecutable(binaryPath);
        return binaryPath;
      }

      binaryPath = await this.downloadAndInstallStackQL(
        downloadDir,
        binaryName
      );
      return binaryPath;
    } catch (error) {
      console.error(`ERROR: [setup] ${error.message}`);
      process.exit(1);
    }
  }

  async removeStackQL() {
    const downloadDir = path.join(process.cwd(), ".stackql");
    await fs.rm(downloadDir, { recursive: true, force: true });
    console.log("stackql download dir removed");
  }

  async upgradeStackQL() {
    if (this.os === SupportedOs.Darwin) {
      await this.removeStackQL();
    }
    const binaryName = this.getBinaryName();
    const downloadDir = path.join(process.cwd(), ".stackql");
    await this.createDownloadDir(downloadDir);
    const binaryPath = await this.downloadAndInstallStackQL(
      downloadDir,
      binaryName
    );
    return binaryPath;
  }
}

module.exports = Downloader;

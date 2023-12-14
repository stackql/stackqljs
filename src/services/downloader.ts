import { join } from '../../deps.ts';
import { SupportedOs } from '../types/platforms.ts';
import { darwinUnpack, unzip } from './unpacker.ts';
import osUtils from '../utils/os.ts';

export class Downloader {
	private os: string;
	private arch: string;
	private urlMap: Record<string, string>;
	constructor() {
		this.os = Deno.build.os; // 'linux', 'darwin', or 'windows'
		this.arch = Deno.build.arch; // 'x86_64', 'arm64', etc.

		this.urlMap = {
			[SupportedOs.Linux]:
				'https://releases.stackql.io/stackql/latest/stackql_linux_amd64.zip',
			[SupportedOs.Windows]:
				'https://releases.stackql.io/stackql/latest/stackql_windows_amd64.zip',
			[SupportedOs.Darwin]:
				'https://storage.googleapis.com/stackql-public-releases/latest/stackql_darwin_multiarch.pkg',
			// Additional OS-architecture combinations can be added here
		};
	}

	private async downloadFile(url: string, downloadDir: string) {
		const res = await fetch(url);
		// create dir if not exists

		const file = await Deno.open(downloadDir, {
			create: true,
			write: true,
		});

		try {
			await res.body?.pipeTo(file.writable).finally(
				() => file.close(), //TODO: fix bad resource id when closing file
			);
		} catch (error) {
			console.error(`ERROR: [downloadFile] ${error.message}`);
		}

		console.log('Closed file');
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
			[SupportedOs.Windows]: 'stackql.exe',
			[SupportedOs.Darwin]: 'stackql/Payload/stackql',
			[SupportedOs.Linux]: 'stackql', // Default case for Linux and other platforms
		};
		const os = Deno.build.os.toLowerCase();

		if (!Object.values(SupportedOs).includes(os as SupportedOs)) {
			throw new Error(`Unsupported OS type: ${os}`);
		}

		const binaryOs = os as SupportedOs;
		return binaryMap[binaryOs];
	}

	private async createDownloadDir(downloadDir: string) {
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
	}
	/**
	 * Gets download dir
	 * @returns download dir
	 */
	private getDownloadDir(): string {
		const projectDir = Deno.cwd();

		if (!projectDir) {
			throw new Error('Unable to determine the project directory.');
		}

		const downloadDir = join(projectDir, '.stackql');

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
	private async installStackQL(downloadDir: string) {
		const url = this.getUrl();

		const archiveFileName = `${downloadDir}/${url.split('/').pop()}`;
		await this.downloadFile(url, archiveFileName);

		console.log('Unpacking stackql binary');
		const unpacker = Deno.build.os === 'darwin' ? darwinUnpack : unzip;
		await unpacker({ downloadDir, archiveFileName });
	}

	private async setExecutable(binaryPath: string) {
		const allowExecOctal = 0o755;
		await osUtils.chmod(binaryPath, allowExecOctal);
	}

	private async downloadAndInstallStackQL({
		downloadDir,
		binaryName,
	}: {
		downloadDir: string;
		binaryName: string;
	}) {
		const binaryPath = join(downloadDir, binaryName);
		await this.installStackQL(downloadDir);
		await this.setExecutable(binaryPath);
		return binaryPath;
	}
	/**
	 * Setup stackql binary, check if binary exists, if not download it
	 */
	public async setupStackQL() {
		try {
			const binaryName = this.getBinaryName();
			const downloadDir = this.getDownloadDir();
			await this.createDownloadDir(downloadDir);

			let binaryPath = join(downloadDir, binaryName);

			if (this.binaryExists(binaryName, downloadDir)) {
				await this.setExecutable(binaryPath);
				return binaryPath;
			}

			binaryPath = await this.downloadAndInstallStackQL({
				downloadDir,
				binaryName,
			});
			return binaryPath;
		} catch (error) {
			console.error(`ERROR: [setup] ${error.message}`);
			Deno.exit(1);
		}
	}

	private async removeStackQL() {
		const downloadDir = this.getDownloadDir();
		await Deno.remove(join(downloadDir, '/'), { recursive: true });
		console.log('stackql download dir removed');
	}

	public async upgradeStackQL() {
		if (Deno.build.os === 'darwin') {
			await this.removeStackQL();
		}
		const binaryName = this.getBinaryName();
		const downloadDir = this.getDownloadDir();
		await this.createDownloadDir(downloadDir);
		const binaryPath = await this.downloadAndInstallStackQL({
			downloadDir,
			binaryName,
		});
		return binaryPath;
	}
}

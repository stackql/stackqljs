import { exec } from "child_process";
import extract from "extract-zip";
import util from "util";
const execPromise = util.promisify(exec);

/**
 * Parameters for unpacking.
 * @typedef {Object} UnpackParams
 * @property {string} downloadDir - Directory to save unpacked files.
 * @property {string} archiveFileName - Name of the archive file.
 */

/**
 * Unpacks a .pkg file on Darwin systems.
 * @param {UnpackParams} params - Parameters for unpacking.
 */
const darwinUnpack = async (params) => {
  console.log("darwinUnpack");
  const { downloadDir, archiveFileName } = params;
  const unpackedFileName = `${downloadDir}/stackql`;
  const command = `pkgutil --expand-full "${archiveFileName}" "${unpackedFileName}"`;

  try {
    const { stdout, stderr } = await execPromise(command);
    console.log(stdout);
    if (stderr) {
      console.error("Error executing pkgutil:", stderr);
      throw new Error("Failed to unpack stackql");
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

/**
 * Unzips a zip file.
 * @param {UnpackParams} params - Parameters for unpacking.
 */
const unzip = async (params) => {
  console.log("unzip");
  try {
    await extract(params.archiveFileName, { dir: params.downloadDir });
  } catch (error) {
    console.error("[unzip] error:", error);
    throw new Error("Failed to unpack stackql");
  }
};

module.exports = { darwinUnpack, unzip };

import { decompress } from "https://deno.land/x/zip/mod.ts";

type UnpackParams = {
  downloadDir: string;
  archiveFileName: string;
};

export const darwinUnpack = async (params: UnpackParams) => {
  const { downloadDir, archiveFileName } = params;
  const unpackedFileName = `${downloadDir}/stackql`;
  const command = `pkgutil --expand-full ${archiveFileName} ${unpackedFileName}`;
  //TODO: change Deno.run to Deno.Command
  const process = Deno.run({
    cmd: command.split(" "),
    stdout: "piped",
    stderr: "piped",
  });

  const [status, stdout, stderr] = await Promise.all([
    process.status(),
    process.output(),
    process.stderrOutput(),
  ]);
  process.close();
  if (status.code !== 0) {
    const output = new TextDecoder().decode(stdout);
    const errorOutput = new TextDecoder().decode(stderr);
    console.error("Error executing pkgutil:", output, errorOutput);
    process.close();
    throw new Error("Failed to unpack stackql");
  }
};

export const unzip = async (params: UnpackParams) => {
  await decompress(params.archiveFileName, params.downloadDir);
};

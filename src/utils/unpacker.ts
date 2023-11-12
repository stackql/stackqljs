import { decompress } from "https://deno.land/x/zip/mod.ts";

type UnpackParams = {
  downloadDir: string;
  archiveFileName: string;
};

export const darwinUnpack = async (params: UnpackParams) => {
  const { downloadDir, archiveFileName } = params;
  const unpackedFileName = `${downloadDir}/stackql`;
  const command =
    `pkgutil --expand-full ${archiveFileName} ${unpackedFileName}`;
  const process = Deno.run({
    cmd: command.split(" "),
    stdout: "piped",
    stderr: "piped",
  });
  const { code } = await process.status();
  if (code !== 0) {
    const output = new TextDecoder().decode(await process.output());
    const errorOutput = new TextDecoder().decode(
      await process.stderrOutput(),
    );
    console.error("Error executing pkgutil:", output, errorOutput);
    process.close();
    throw new Error("Failed to unpack stackql");
  }
  process.close();
};

export const unzip = async (params: UnpackParams) => {
  await decompress(params.archiveFileName, params.downloadDir);
};

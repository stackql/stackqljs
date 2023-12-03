import { existsSync } from "https://deno.land/std/fs/mod.ts";
import { join } from "https://deno.land/std@0.133.0/path/mod.ts";
import { parse } from "https://deno.land/std@0.134.0/encoding/csv.ts";

export const removeStackQLDownload = async () => {
  const projectDir = Deno.cwd();
  const stackqlPath = join(projectDir, ".stackql");
  console.log("stackqlPath", stackqlPath);
  console.log("existsSync(stackqlPath)", existsSync(stackqlPath));
  if (existsSync(stackqlPath)) {
    console.log("Removing .stackql directory");
    await Deno.remove(stackqlPath, { recursive: true });
  }
};

export const startStackQLServer = async (port = 5444) => {
  const command = new Deno.Command("stackql", {
    args: [
      "srv",
      "--pgsrv.address=0.0.0.0",
      `--pgsrv.port=${port}`,
    ],
    stdout: "inherit",
    stderr: "inherit",
  });
  const process = command.spawn();
  //TODO: find a way to wait for the server to be ready
  const closeProcess = async () => {
    try {
      console.log("Closing process");
      process.kill();
      await process.status;
    } catch (error) {
      const alreadyClosed = error.message.includes(
        "Child process has already terminated",
      );
      if (alreadyClosed) {
        console.log("Process already closed");
        return;
      }
      throw error;
    }
  };
  return { closeProcess };
};

export const isJsonString = (str: string) => {
  try {
    JSON.parse(str);
  } catch (_error) {
    return false;
  }
  return true;
};

export const isCsvString = async (str: string) => {
  try {
    await parse(str);
  } catch (_error) {
    return false;
  }
  return true;
};

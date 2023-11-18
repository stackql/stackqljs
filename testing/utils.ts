import { existsSync } from "https://deno.land/std/fs/mod.ts";
import { join } from "https://deno.land/std@0.133.0/path/mod.ts";

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
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const closeProcess = async () => {
    console.log("Closing process");
    process.kill();
    await process.status;
  };
  return { closeProcess };
};

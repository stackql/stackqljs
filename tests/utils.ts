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

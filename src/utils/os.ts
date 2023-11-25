const fileExists = (path?: string) => {
  if (!path) {
    return false;
  }
  try {
    Deno.statSync(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
};

const chomod = async (path: string, mode: number) => {
  if (Deno.build.os !== "windows") {
    await Deno.chmod(path, mode);
  }
};

const runCli = async (path: string, args: string[]) => {
  const process = new Deno.Command(path, {
    args,
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
    throw new Error(errorMessage);
  }
};

const osUtils = {
  fileExists,
  chomod,
  runCli,
};

export default osUtils;

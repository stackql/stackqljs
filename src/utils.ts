export const fileExists = (path: string) => {
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

export const chomod = async (path: string, mode: number) => {
  if (Deno.build.os !== "windows") {
    await Deno.chmod(path, mode);
  }
};

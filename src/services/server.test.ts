import { Server } from "./server.ts";
import { assert } from "https://deno.land/std@0.207.0/assert/assert.ts";
import { startStackQLServer } from "../../testing/utils.ts";

Deno.test("Successful Connection", async () => {
  const { closeProcess } = await startStackQLServer();
  const server = new Server();
  const pg = await server.connect(
    "postgres://postgres:password@localhost:5444/postgres",
  );
  assert(pg);
  await server.close();
  await closeProcess();
});

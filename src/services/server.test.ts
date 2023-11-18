import {
  assertSpyCall,
  assertSpyCalls,
  returnsNext,
  stub,
} from "https://deno.land/std@0.207.0/testing/mock.ts";

import { Server } from "./server.ts";
import { assert } from "https://deno.land/std@0.207.0/assert/assert.ts";
import { startStackQLServer } from "../../testing/utils.ts";

Deno.test("Successful Connection", async () => {
  const { closeProcess } = await startStackQLServer();
  const server = new Server();
  const pg = await server.connect("http://127.0.0.1:5444");
  assert(pg);
  await server.close();
  await closeProcess();
});

import {
  assertRejects,
  assertStringIncludes,
} from "https://deno.land/std@0.160.0/testing/asserts.ts";
import osUtils from "./os.ts";

Deno.test("osUtils.runCli: Test Successful Execution", async () => {
  const command = Deno.build.os === "windows" ? "cmd" : "echo";
  const args = Deno.build.os === "windows"
    ? ["/c", "echo", "Hello, World!"]
    : ["Hello, World!"];
  const result = await osUtils.runCli(command, args);
  assertStringIncludes(result.trim(), "Hello, World!");
});

Deno.test("osUtils.runCli: Test Failed Execution", () => {
  const command = "invalid";
  const args = Deno.build.os === "windows"
    ? ["/c", "echo", "Hello, World!"]
    : ["Hello, World!"];
  assertRejects(async () => {
    await osUtils.runCli(command, args);
  });
});

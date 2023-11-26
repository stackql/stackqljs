import { assertStringIncludes } from "https://deno.land/std@0.206.0/assert/mod.ts";
import { StackQL } from "./stackql.ts";
import { startStackQLServer } from "../testing/utils.ts";
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.160.0/testing/asserts.ts";
import { Downloader } from "./services/downloader.ts";
import {
  assertSpyCall,
  resolvesNext,
  spy,
  stub,
} from "https://deno.land/std@0.207.0/testing/mock.ts";
import osUtils from "./utils/os.ts";
import { assert } from "https://deno.land/std@0.133.0/_util/assert.ts";

const downloader = new Downloader();

const setupStackQL = async () => {
  await downloader.setupStackQL();
};

Deno.test("StackQL CLI run query", async () => {
  await setupStackQL();

  // Arrange
  const stackQL = new StackQL();
  await stackQL.initialize({ serverMode: false });

  const pullQuery = "REGISTRY PULL github;";
  const providerQuery = "SHOW PROVIDERS";
  const githubTestQuery =
    `SELECT id, name from github.repos.repos where org='stackql'`;

  // Act
  await stackQL.runQuery(pullQuery);
  const result = await stackQL.runQuery(providerQuery);
  const githubResult = await stackQL.runQuery(githubTestQuery);

  // Assert
  assertStringIncludes(result, "name");
  assertStringIncludes(result, "version");
  assertStringIncludes(result, "github");
  assertStringIncludes(githubResult, "stackql");
});

Deno.test("Set properties from configs", async () => {
  await setupStackQL();
  const runCliSpy = spy(osUtils, "runCommand");
  const stackQL = new StackQL();
  await stackQL.initialize({
    serverMode: false,
    maxResults: 100,
    pageLimit: 10,
    maxDepth: 5,
    apiTimeout: 5000,
  });
  const githubTestQuery =
    `SELECT id, name from github.repos.repos where org='stackql'`;

  await stackQL.runQuery(githubTestQuery);

  const params = stackQL.getParams();
  assertEquals(params.length, 8);
  assertEquals(params, [
    "--http.response.maxResults",
    "100",
    "--http.response.pageLimit",
    "10",
    "--indirect.depth.max",
    "5",
    "--apirequesttimeout",
    "5000",
  ]);
  const binaryPath = stackQL.getBinaryPath();
  assert(binaryPath);
  assertSpyCall(runCliSpy, 0, {
    args: [binaryPath, ["exec", githubTestQuery, ...params]],
  });
});

Deno.test("Set proxy properties from configs", async () => {
  await setupStackQL();
  const runCommandSpy = spy(osUtils, "runCommand");
  const stackQL = new StackQL();
  await stackQL.initialize({
    serverMode: false,
    proxyHost: "localhost",
    proxyPort: 8080,
    proxyUser: "user",
    proxyPassword: "password",
    proxyScheme: "https",
  });
  const githubTestQuery =
    `SELECT id, name from github.repos.repos where org='stackql'`;

  await stackQL.runQuery(githubTestQuery);

  const params = stackQL.getParams();
  assertEquals(params, [
    "--http.proxy.host",
    "localhost",
    "--http.proxy.port",
    "8080",
    "--http.proxy.user",
    "user",
    "--http.proxy.password",
    "password",
    "--http.proxy.scheme",
    "https",
  ]);
  const binaryPath = stackQL.getBinaryPath();
  assert(binaryPath);
  assertSpyCall(runCommandSpy, 0, {
    args: [binaryPath, ["exec", githubTestQuery, ...params]],
  });
});

Deno.test("StackQL runServerQuery", async () => {
  const { closeProcess } = await startStackQLServer();
  const stackQL = new StackQL();

  try {
    // Arrange
    await stackQL.initialize({
      serverMode: true,
      connectionString: "postgres://postgres:password@localhost:5444/postgres",
    });
    const pullQuery = "REGISTRY PULL github;";
    const testQuery = "SHOW SERVICES IN github LIKE '%repos%';"; // Replace with a valid query for your context

    // Act
    await stackQL.runServerQuery(pullQuery);
    const results = await stackQL.runServerQuery(testQuery);
    assertExists(results);
    assertEquals(results.length, 1);
    const result = results[0] as {
      name: string;
    };
    assertEquals(result.name, "repos");

    // Assert
  } finally {
    // Cleanup
    await closeProcess();
    await stackQL.closeConnection();
  }
});

Deno.test("getVersion", async () => {
  await setupStackQL();
  const stackQL = new StackQL();
  await stackQL.initialize({ serverMode: false });
  const versionRegex = /^v?(\d+(?:\.\d+)*)$/;
  const shaRegex = /^[a-f0-9]{7}$/;

  const { version, sha } = await stackQL.getVersion();

  assert(version);
  assert(sha);
  assert(versionRegex.test(version));
  assert(shaRegex.test(sha));
});

Deno.test("getVersion when version and sha are undefined", async () => {
  await setupStackQL();
  const stackQL = new StackQL();
  await stackQL.initialize({ serverMode: false });
  const versionRegex = /^v?(\d+(?:\.\d+)*)$/;
  const shaRegex = /^[a-f0-9]{7}$/;
  (stackQL as any).version = undefined;
  (stackQL as any).sha = undefined;
  assert((stackQL as any).version === undefined);
  assert((stackQL as any).sha === undefined);

  const { version, sha } = await stackQL.getVersion();

  assert(version);
  assert(sha);
  assert(versionRegex.test(version));
  assert(shaRegex.test(sha));
});

Deno.test("upgrade", async () => {
  await setupStackQL();
  const stackQL = new StackQL();
  await stackQL.initialize({ serverMode: false });
  (stackQL as any).version = undefined;
  (stackQL as any).sha = undefined;
  const versionRegex = /^v?(\d+(?:\.\d+)*)$/;
  const shaRegex = /^[a-f0-9]{7}$/;
  assert((stackQL as any).version === undefined);
  assert((stackQL as any).sha === undefined);

  const { version, sha } = await stackQL.upgrade();

  assert(version);
  assert(sha);
  assert(versionRegex.test(version));
  assert(shaRegex.test(sha));
});

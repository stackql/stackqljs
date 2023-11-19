import { assertStringIncludes } from "https://deno.land/std@0.206.0/assert/mod.ts";
import { StackQL } from "./stackql.ts";
import { removeStackQLDownload, startStackQLServer } from "../testing/utils.ts";
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.160.0/testing/asserts.ts";

Deno.test("StackQL runQuery - Successful Execution", async () => {
  // Arrange
  await removeStackQLDownload();
  const stackQL = new StackQL();
  await stackQL.initialize({ serverMode: false });
  const pullQuery = "REGISTRY PULL okta;";
  const testQuery = "SHOW PROVIDERS"; // Replace with a valid query for your context

  // Act
  await stackQL.runQuery(pullQuery);
  const result = await stackQL.runQuery(testQuery);

  // Assert
  assertStringIncludes(result, "name");
  assertStringIncludes(result, "version");
  assertStringIncludes(result, "okta");
});

Deno.test.only("stackQl runQuery - Auth", async () => {
  // Follow the setting here https://stackql.io/blog/github-provider-for-stackql-released#query-protected-resources

  const stackQL = new StackQL();
  await stackQL.initialize({
    serverMode: false,
  });
  const pullQuery = "REGISTRY PULL github;";
  const testQuery =
    `SELECT id, name, private from github.repos.repos where owner='yunchengyang515'`; // Replace with a valid query for your context

  await stackQL.runQuery(pullQuery);
  const result = await stackQL.runQuery(testQuery);
  console.log("result is ", result);

  assertStringIncludes(result, "stackql");
});

Deno.test("StackQL runServerQuery - Successful Execution", async () => {
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

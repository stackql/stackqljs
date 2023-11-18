import { assertStringIncludes } from "https://deno.land/std@0.206.0/assert/mod.ts";
import { StackQL } from "./stackql.ts";
import { removeStackQLDownload, startStackQLServer } from "../testing/utils.ts";

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

Deno.test.only("StackQL runServerQuery - Successful Execution", async () => {
  const { closeProcess } = await startStackQLServer();

  try {
    // Arrange
    const stackQL = new StackQL();
    await stackQL.initialize({
      serverMode: true,
      connectionString: "http://127.0.0.1:5444",
    });
    const pullQuery = "REGISTRY PULL github;";
    const testQuery = "SHOW PROVIDERS;"; // Replace with a valid query for your context

    // Act
    const pullResults = await stackQL.runServerQuery(pullQuery);
    const results = await stackQL.runServerQuery(testQuery);

    // Assert
  } finally {
    // Cleanup
    await closeProcess();
  }
});

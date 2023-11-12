import { assertStringIncludes } from "https://deno.land/std@0.206.0/assert/mod.ts";
import { StackQL } from "../stackql.ts";

Deno.test("StackQL runQuery - Successful Execution", async () => {
  // Arrange
  const stackQL = new StackQL();
  const pullQuery = "REGISTER PULL okta;";
  const testQuery = "SHOW PROVIDERS"; // Replace with a valid query for your context

  // Act
  await stackQL.runQuery(pullQuery);
  const result = await stackQL.runQuery(testQuery);

  // Assert
  assertStringIncludes(result, "name");
  assertStringIncludes(result, "version");
  assertStringIncludes(result, "okta");
});

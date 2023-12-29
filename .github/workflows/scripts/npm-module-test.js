import stackQL from "@stackql/stackqljs"; // Adjust this if the import path differs
const assert = require("assert").strict;

async function runTests() {
  try {
    // Initialize stackQL
    await stackQL.initialize({ serverMode: false });

    // Define queries
    const providerQuery = "SHOW PROVIDERS";
    const githubTestQuery = `SELECT id, name from github.repos.repos where org='stackql' and name='stackql'`;

    // Execute queries
    const result = await stackQL.executeStatement(providerQuery);
    const githubResult = await stackQL.execute(githubTestQuery);
    const githubResultObj = githubResult[0];

    // Assert
    assert(result.includes("name"), 'Result should include "name"');
    assert(result.includes("version"), 'Result should include "version"');
    assert(result.includes("github"), 'Result should include "github"');
    assert.equal(
      githubResultObj.name,
      "stackql",
      'GitHub result name should be "stackql"'
    );

    console.log("All tests passed!");
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1); // Exit with error code
  }
}

runTests();

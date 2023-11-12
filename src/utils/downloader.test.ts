import { assertExists } from "https://deno.land/std@0.206.0/assert/assert_exists.ts";
import { Downloader } from "./downloader.ts";

Deno.test("Downloader setupStackQL Integration Test", async () => {
  // Arrange
  const downloader = new Downloader();

  // Act
  try {
    const binaryPath = await downloader.setupStackQL();

    // Assert
    assertExists(binaryPath);
    // Check if the binary exists after setupStackQL is called

    console.log(
      "Test passed: setupStackQL completed without errors and binary exists.",
    );
  } catch (error) {
    console.error("Test failed:", error);
    throw error; // This will cause the test to fail
  }
});

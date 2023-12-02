import { assertExists } from "https://deno.land/std@0.206.0/assert/assert_exists.ts";
import { Downloader } from "./downloader.ts";
import { removeStackQLDownload } from "../../testing/utils.ts";
import {
  assertSpyCalls,
  spy,
} from "https://deno.land/std@0.207.0/testing/mock.ts";

Deno.test("Downloader setupStackQL and upgrade Test", async () => {
  // Arrange
  await removeStackQLDownload();
  const downloader = new Downloader();
  let binaryPath: string;
  const denoOpenSpy = spy(Deno, "open");

  // Act
  const setupTest = async () => {
    try {
      binaryPath = await downloader.setupStackQL();

      // Assert
      assertExists(binaryPath);
      assertSpyCalls(denoOpenSpy, 1);
      // Check if the binary exists after setupStackQL is called

      console.log(
        "Test passed: setupStackQL completed without errors and binary exists."
      );
    } catch (error) {
      console.error("Test failed:", error);
      throw error; // This will cause the test to fail
    }
  };

  const upgradeTest = async () => {
    try {
      binaryPath = await downloader.upgradeStackQL();

      assertExists(binaryPath);
      assertSpyCalls(denoOpenSpy, 2);
    } catch (error) {
      console.error("Test failed:", error);
      throw error; // This will cause the test to fail
    }
  };

  await setupTest();
  await upgradeTest();
});

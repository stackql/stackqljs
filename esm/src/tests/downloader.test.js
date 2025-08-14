import fs from "fs/promises";
import path from "path";
import https from "https";
import { describe, it, expect, beforeEach, vi } from "vitest";
import Downloader from "../downloader";

vi.mock("fs/promises");
vi.mock("https");

describe("Downloader", () => {
  let downloader;

  beforeEach(() => {
    downloader = new Downloader();
    vi.resetAllMocks();
  });

  describe("downloadFile", () => {
    it("should download a file successfully", async () => {
      const mockStream = {
        on: vi.fn((event, handler) => {
          if (event === "finish") {
            setTimeout(handler, 0); // Simulate async file write
          }
          return mockStream;
        }),
        pipe: vi.fn(() => mockStream),
      };
      vi.spyOn(fs, "createWriteStream").mockReturnValue(mockStream);
      https.get.mockImplementation((url, callback) => {
        callback(mockStream);
        return {
          on: vi.fn(),
        };
      });

      const url = "http://example.com/file.zip";
      const downloadDir = "/path/to/download";

      await downloader.downloadFile(url, downloadDir);

      expect(fs.createWriteStream).toHaveBeenCalledWith(downloadDir);
      expect(mockStream.pipe).toHaveBeenCalled();
      expect(mockStream.on).toHaveBeenCalledWith(
        "finish",
        expect.any(Function)
      );
    });
  });
});

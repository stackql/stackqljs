import { randomFillSync } from "crypto";

export const crypto = {
  getRandomValues: (buffer) => randomFillSync(buffer),
  // ... other crypto methods you want to include
};

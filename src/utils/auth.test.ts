import { assertEquals } from "https://deno.land/std@0.206.0/assert/assert_equals.ts";
import { formatAuth } from "./auth.ts";
import { assertThrows } from "https://deno.land/std@0.206.0/assert/assert_throws.ts";

Deno.test("formatAuth with valid string input", () => {
  const input = '{"key": "value"}';
  const expected = {
    authObj: { key: "value" },
    authStr: '{"key": "value"}',
  };
  assertEquals(formatAuth(input), expected);
});

Deno.test("formatAuth with valid object input", () => {
  const input = { key: "value" };
  const expected = {
    authObj: { key: "value" },
    authStr: '{"key":"value"}',
  };
  assertEquals(formatAuth(input), expected);
});

Deno.test("formatAuth with no input", () => {
  assertThrows(
    () => formatAuth(),
    Error,
    "ERROR: [formatAuth] auth key supplied with no value",
  );
});

Deno.test("formatAuth with invalid input type (number)", () => {
  assertThrows(
    () => formatAuth(123 as any), // Casting to 'any' to bypass TypeScript type checking
    Error,
    "ERROR: [formatAuth] auth key supplied with invalid type",
  );
});

Deno.test("formatAuth with invalid input type (boolean)", () => {
  assertThrows(
    () => formatAuth(true as any), // Casting to 'any' to bypass TypeScript type checking
    Error,
    "ERROR: [formatAuth] auth key supplied with invalid type",
  );
});

/**
 * Vitest setup for the `unit` project (node environment).
 *
 * - Loads the MSW Node server and starts it for every test file.
 * - Strict `onUnhandledRequest: "error"` so any un-mocked fetch blows up
 *   loudly instead of silently passing.
 */
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
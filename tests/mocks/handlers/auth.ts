/**
 * Auth handlers — /auth/osu (GET, redirects to OAuth provider), /auth/logout.
 *
 * M1 leaves these empty; M5's Playwright suite (or AuthContext unit tests in
 * M3) can opt-in by importing individual handlers via `server.use(...)`.
 */
import type { HttpHandler } from "msw";

export const authHandlers: HttpHandler[] = [];
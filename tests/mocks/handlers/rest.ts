/**
 * REST handlers — /api/v1/* (room / beatmap / admin endpoints).
 *
 * M1 leaves these empty; M2 fills them when `rooms.test.ts` etc. require
 * real network-level mocking instead of `vi.mock("@/app/lib/api", ...)`.
 */
import type { HttpHandler } from "msw";

export const restHandlers: HttpHandler[] = [];
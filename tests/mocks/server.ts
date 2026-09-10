/**
 * Shared MSW server for the `unit` and `component` Vitest projects.
 *
 * Handlers are split by domain:
 * - graphql.ts — POST /graphql (operationName matched)
 * - rest.ts    — /api/v1/*
 * - auth.ts    — /auth/osu, /auth/logout
 *
 * New handlers go into the matching file; `setup.unit.ts` / `setup.component.ts`
 * start this server globally.
 */
import { setupServer } from "msw/node";

import { graphqlHandlers } from "./handlers/graphql";
import { restHandlers } from "./handlers/rest";
import { authHandlers } from "./handlers/auth";

export const server = setupServer(...graphqlHandlers, ...restHandlers, ...authHandlers);
/**
 * GraphQL handlers — operationName-matched against the body sent by
 * `graphqlRequest` / `serverGraphQLRequest` in `app/lib/api.ts`.
 *
 * M1 leaves these empty; commands.test.ts uses `vi.mock("@/app/lib/api", ...)`
 * directly, so no handler is exercised yet. M2 fills these in.
 */
import type { HttpHandler } from "msw";

export const graphqlHandlers: HttpHandler[] = [];
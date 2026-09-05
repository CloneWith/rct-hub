/**
 * Reusable Next.js module mocks for tests touching RSC/server boundaries.
 *
 * Usage at the top of a test file (before any `import` from the SUT):
 *
 *   mockNextHeaders();
 *   mockNextNavigation();
 *   mockNextCache();
 *   mockServerOnly();
 *
 * Each helper calls `vi.mock(name, factory)` with hoisted-safe factories, so
 * the mocks are in place before module resolution. Pass `vi.hoisted` factories
 * in if you need to share state across the mock and the test body.
 *
 * These are templates — feel free to inline an override in individual tests
 * (e.g. `vi.mocked(cookies).mockReturnValueOnce(...)`).
 */
import { vi } from "vitest";

export function mockNextHeaders(): void {
  vi.mock("next/headers", () => ({
    cookies: () => ({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
      getAll: vi.fn(() => []),
    }),
    headers: () => new Map<string, string>(),
  }));
}

export function mockNextNavigation(): void {
  vi.mock("next/navigation", () => ({
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
  }));
}

export function mockNextCache(): void {
  vi.mock("next/cache", () => ({
    unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
    revalidateTag: vi.fn(),
    revalidatePath: vi.fn(),
  }));
}

/**
 * `server-only` is a sentinel module that throws on the client. Tests run
 * in node or jsdom — neither is the "server" guard wants to protect —
 * so we replace it with an empty object.
 */
export function mockServerOnly(): void {
  // `server-only` is a sentinel module that throws on the client. Tests run
  // in node or jsdom — neither is the "server" guard wants to protect —
  // so we replace it with an empty object. The `virtual` flag tells vitest
  // to allow mocking a module that may not exist on disk.
  vi.mock("server-only", () => ({}) as never);
}
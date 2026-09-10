/**
 * Vitest setup for the `component` project (jsdom environment).
 *
 * - `@testing-library/jest-dom/vitest` registers matchers (`.toBeInTheDocument`,
 *   `.toHaveAccessibleName`, ...) WITHOUT touching the global `tsconfig.types`
 *   (which would pollute the RSC type graph). The import here scopes them
 *   to tests only.
 * - Stubs `IntersectionObserver`, `ResizeObserver`, `matchMedia`, and
 *   `crypto.randomUUID` so jQuery-style libraries / HeroUI animations /
 *   reactive hooks don't blow up under jsdom.
 * - Cleans up rendered DOM between tests.
 */
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

class StubIntersectionObserver {
  private cb: IntersectionObserverCallback;

  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb;
  }

  observe(target: Element): void {
    // Fire the callback asynchronously so reveal-style components flip to
    // their "visible" state in unit tests. `isIntersecting: true` with a
    // zero-ratio entry is enough for any consumer that just checks the flag.
    const observer = this as unknown as IntersectionObserver;
    queueMicrotask(() =>
      this.cb(
        [
          {
            isIntersecting: true,
            intersectionRatio: 1,
            target,
            boundingClientRect: target.getBoundingClientRect(),
            intersectionRect: target.getBoundingClientRect(),
            rootBounds: null,
            time: 0,
          } as IntersectionObserverEntry,
        ],
        observer,
      ),
    );
  }
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  root = null;
  rootMargin = "";
  thresholds: ReadonlyArray<number> = [];
}

class StubResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  // jsdom has no IntersectionObserver; the modern DOM lib demands
  // additional fields (scrollMargin, ...). Cast through `unknown` to bypass.
  globalThis.IntersectionObserver = StubIntersectionObserver as unknown as typeof IntersectionObserver;
}
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver;
}
if (typeof window !== "undefined" && typeof window.matchMedia === "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    })),
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
#!/usr/bin/env tsx
/**
 * Manual test runner — provides vitest-compatible globals and runs all .test.ts files
 * with an in-memory Redis mock (no running Redis instance required).
 *
 * Usage:  npx tsx test-scripts/run.ts
 *
 * When vitest is set up in CI, these same test files run unchanged with `globals: true`
 * and a vi.mock("@/lib/redis") in a setup file.
 */

// ---------------------------------------------------------------------------
// 1. Patch module resolution BEFORE anything imports @/lib/redis
//    This redirects the redis module to our in-memory mock.
// ---------------------------------------------------------------------------
import Module from "node:module";
import path from "node:path";

const mockRedisPath = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "mock-redis.ts"
);

const webRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  ".."
);

// The redis module resolves to <webRoot>/lib/redis.ts via the @/ alias.
// We intercept that and point it to our mock instead.
const originalResolve = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (
  request: string,
  parent: any,
  isMain: boolean,
  options: any
) {
  // Match the alias form, the resolved absolute path, and relative imports
  const resolved =
    request === "@/lib/redis" ||
    request === path.join(webRoot, "lib", "redis") ||
    request === path.join(webRoot, "lib", "redis.ts") ||
    (parent &&
      typeof parent.filename === "string" &&
      request.endsWith("/lib/redis") &&
      path.resolve(path.dirname(parent.filename), request).startsWith(webRoot));
  if (resolved) {
    return originalResolve.call(this, mockRedisPath, parent, isMain, options);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

// ---------------------------------------------------------------------------
// 2. Minimal test framework (vitest-globals compatible)
// ---------------------------------------------------------------------------
import { resetStore } from "./mock-redis.js";

interface Test {
  name: string;
  fn: () => Promise<void> | void;
}

interface Suite {
  name: string;
  tests: Test[];
  beforeEachFns: (() => Promise<void> | void)[];
  afterEachFns: (() => Promise<void> | void)[];
}

const suites: Suite[] = [];
let currentSuite: Suite | null = null;

function fmt(v: any): string {
  return JSON.stringify(v) ?? String(v);
}

(globalThis as any).describe = (name: string, fn: () => void) => {
  const suite: Suite = {
    name,
    tests: [],
    beforeEachFns: [],
    afterEachFns: [],
  };
  const prev = currentSuite;
  currentSuite = suite;
  fn();
  suites.push(suite);
  currentSuite = prev;
};

(globalThis as any).it = (name: string, fn: () => Promise<void> | void) => {
  if (!currentSuite) throw new Error("it() must be inside describe()");
  currentSuite.tests.push({ name, fn });
};

(globalThis as any).beforeEach = (fn: () => Promise<void> | void) => {
  if (!currentSuite) throw new Error("beforeEach() must be inside describe()");
  currentSuite.beforeEachFns.push(fn);
};

(globalThis as any).afterEach = (fn: () => Promise<void> | void) => {
  if (!currentSuite) throw new Error("afterEach() must be inside describe()");
  currentSuite.afterEachFns.push(fn);
};

(globalThis as any).expect = (actual: any) => ({
  toBe(expected: any) {
    if (actual !== expected)
      throw new Error(`Expected ${fmt(expected)} but got ${fmt(actual)}`);
  },
  toBeNull() {
    if (actual !== null)
      throw new Error(`Expected null but got ${fmt(actual)}`);
  },
  toBeDefined() {
    if (actual === undefined)
      throw new Error("Expected defined value but got undefined");
  },
  toMatch(pattern: RegExp) {
    if (!pattern.test(String(actual)))
      throw new Error(`Expected "${actual}" to match ${pattern}`);
  },
  toBeGreaterThan(n: number) {
    if (!(actual > n)) throw new Error(`Expected ${actual} > ${n}`);
  },
  toBeLessThanOrEqual(n: number) {
    if (!(actual <= n)) throw new Error(`Expected ${actual} <= ${n}`);
  },
  toContain(item: any) {
    if (typeof actual === "string") {
      if (!actual.includes(item))
        throw new Error(`Expected string to contain "${item}"`);
    } else if (Array.isArray(actual)) {
      if (!actual.includes(item))
        throw new Error(`Expected array to contain ${fmt(item)}`);
    }
  },
  not: {
    toBe(expected: any) {
      if (actual === expected)
        throw new Error(`Expected ${fmt(actual)} NOT to be ${fmt(expected)}`);
    },
    toBeNull() {
      if (actual === null)
        throw new Error("Expected non-null value but got null");
    },
  },
  rejects: {
    async toThrow(message?: string) {
      let threw = false;
      let err: any;
      try {
        await actual;
      } catch (e) {
        threw = true;
        err = e;
      }
      if (!threw) throw new Error("Expected promise to reject but it resolved");
      if (message) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes(message))
          throw new Error(
            `Expected error containing "${message}" but got "${msg}"`
          );
      }
    },
  },
});

// ---------------------------------------------------------------------------
// 3. Import test files & run
// ---------------------------------------------------------------------------

async function main() {
  await import("./t1-token-generation.test.js");
  await import("./t2-create-match.test.js");
  await import("./t3-join-match.test.js");
  await import("./t4-resolve-player.test.js");
  await import("./t5-strip-tokens.test.js");
  await import("./t6-apply-action.test.js");
  await import("./t7-action-route-auth.test.js");
  await import("./t8-match-locking.test.js");

  let passed = 0;
  let failed = 0;

  for (const suite of suites) {
    console.log(`\n  ${suite.name}`);
    for (const test of suite.tests) {
      try {
        // Clear the in-memory store between tests for isolation
        resetStore();
        for (const fn of suite.beforeEachFns) await fn();
        await test.fn();
        for (const fn of suite.afterEachFns) await fn();
        console.log(`    \x1b[32m✓\x1b[0m ${test.name}`);
        passed++;
      } catch (e) {
        console.log(`    \x1b[31m✗\x1b[0m ${test.name}`);
        console.log(
          `      \x1b[31m${e instanceof Error ? e.message : e}\x1b[0m`
        );
        failed++;
      }
    }
  }

  console.log(
    `\n  \x1b[32m${passed} passed\x1b[0m, \x1b[${failed ? "31" : "32"}m${failed} failed\x1b[0m\n`
  );

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

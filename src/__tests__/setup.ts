/**
 * Global test setup:
 *  1. Extend Jest/Vitest matchers with @testing-library/jest-dom
 *  2. Provide a minimal chrome global so extension code can be imported in jsdom
 */
import "@testing-library/jest-dom";
import { vi } from "vitest";

const chromeMock = {
  storage: {
    local: {
      // Default: acts as if storage is empty. Override per-test with mockImplementation.
      get: vi.fn(
        (_key: string, cb: (result: Record<string, unknown>) => void) => {
          cb({});
        },
      ),
      set: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getURL: vi.fn(
      (path: string) => `chrome-extension://fakeid000000000000000000/${path}`,
    ),
  },
  scripting: {
    insertCSS: vi.fn(),
    executeScript: vi.fn(),
  },
  declarativeNetRequest: {
    updateSessionRules: vi.fn(),
    updateDynamicRules: vi.fn(),
    ResourceType: {},
    RuleActionType: {},
    HeaderOperation: {},
  },
};

Object.defineProperty(globalThis, "chrome", {
  value: chromeMock,
  writable: true,
  configurable: true,
});

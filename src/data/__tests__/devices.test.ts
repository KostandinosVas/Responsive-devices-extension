import { describe, it, expect } from "vitest";
import { DEVICES, DEVICE_MAP } from "../devices";

describe("DEVICES data integrity", () => {
  it("has at least one entry per category", () => {
    const categories = new Set(DEVICES.map((d) => d.category));
    expect(categories).toContain("mobile");
    expect(categories).toContain("tablet");
    expect(categories).toContain("desktop");
    expect(categories).toContain("custom");
  });

  it("all device ids are unique", () => {
    const ids = DEVICES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all device names are unique", () => {
    const names = DEVICES.map((d) => d.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("all devices have valid width in range [200, 5000]", () => {
    for (const d of DEVICES) {
      expect(d.width, `${d.name} width`).toBeGreaterThanOrEqual(200);
      expect(d.width, `${d.name} width`).toBeLessThanOrEqual(5000);
    }
  });

  it("all devices have valid height in range [200, 5000]", () => {
    for (const d of DEVICES) {
      expect(d.height, `${d.name} height`).toBeGreaterThanOrEqual(200);
      expect(d.height, `${d.name} height`).toBeLessThanOrEqual(5000);
    }
  });

  it("all devices have non-empty id and name", () => {
    for (const d of DEVICES) {
      expect(d.id.trim().length, `empty id`).toBeGreaterThan(0);
      expect(d.name.trim().length, `empty name for ${d.id}`).toBeGreaterThan(0);
    }
  });

  it("DEVICE_MAP contains every device keyed by id", () => {
    for (const d of DEVICES) {
      expect(DEVICE_MAP[d.id], `DEVICE_MAP missing "${d.id}"`).toBe(d);
    }
  });

  it('DEVICE_MAP has a "custom" fallback entry', () => {
    expect(DEVICE_MAP["custom"]).toBeDefined();
    expect(DEVICE_MAP["custom"].category).toBe("custom");
  });

  const VALID_BROWSER_MODES = [
    "chrome",
    "safari-ios",
    "safari-macos",
    "firefox-android",
    "firefox-desktop",
  ];

  it("defaultBrowser (when set) is a valid BrowserMode", () => {
    for (const d of DEVICES) {
      if (d.defaultBrowser !== undefined) {
        expect(
          VALID_BROWSER_MODES,
          `${d.id}.defaultBrowser "${d.defaultBrowser}" unknown`,
        ).toContain(d.defaultBrowser);
      }
    }
  });

  it("pixelRatio (when set) is a positive number", () => {
    for (const d of DEVICES) {
      if (d.pixelRatio !== undefined) {
        expect(d.pixelRatio, `${d.id}.pixelRatio`).toBeGreaterThan(0);
      }
    }
  });
});

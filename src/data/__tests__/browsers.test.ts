import { describe, it, expect } from "vitest";
import { BROWSERS, BROWSER_LIST } from "../browsers";
import type { BrowserMode } from "../../types";

const ALL_MODES: BrowserMode[] = [
  "chrome",
  "safari-ios",
  "safari-macos",
  "firefox-android",
  "firefox-desktop",
];

describe("BROWSERS data integrity", () => {
  it("has a profile for every BrowserMode", () => {
    for (const mode of ALL_MODES) {
      expect(BROWSERS[mode], `missing profile for "${mode}"`).toBeDefined();
    }
  });

  it("each profile .id matches its record key", () => {
    for (const mode of ALL_MODES) {
      expect(BROWSERS[mode].id).toBe(mode);
    }
  });

  it('chrome profile has an empty UA string (means "no override")', () => {
    expect(BROWSERS.chrome.ua).toBe("");
  });

  it("non-chrome profiles have non-empty UA strings", () => {
    for (const mode of ALL_MODES.filter((m) => m !== "chrome")) {
      expect(
        BROWSERS[mode].ua.length,
        `${mode} UA string is empty`,
      ).toBeGreaterThan(0);
    }
  });

  it("non-chrome UA strings start with Mozilla/", () => {
    for (const mode of ALL_MODES.filter((m) => m !== "chrome")) {
      expect(BROWSERS[mode].ua, `${mode} UA prefix`).toMatch(/^Mozilla\//);
    }
  });

  it("all profiles have a non-empty label and shortLabel", () => {
    for (const mode of ALL_MODES) {
      const p = BROWSERS[mode];
      expect(p.label.trim().length, `${mode} label`).toBeGreaterThan(0);
      expect(p.shortLabel.trim().length, `${mode} shortLabel`).toBeGreaterThan(
        0,
      );
    }
  });

  it("all profiles have a non-empty color class string", () => {
    for (const mode of ALL_MODES) {
      expect(
        BROWSERS[mode].color.trim().length,
        `${mode} color`,
      ).toBeGreaterThan(0);
    }
  });

  it("all profiles expose a limitations array", () => {
    for (const mode of ALL_MODES) {
      expect(
        Array.isArray(BROWSERS[mode].limitations),
        `${mode} limitations`,
      ).toBe(true);
    }
  });

  it("chrome has zero limitations", () => {
    expect(BROWSERS.chrome.limitations).toHaveLength(0);
  });

  it("non-chrome profiles each have at least one limitation note", () => {
    for (const mode of ALL_MODES.filter((m) => m !== "chrome")) {
      expect(
        BROWSERS[mode].limitations.length,
        `${mode} should have limitations`,
      ).toBeGreaterThan(0);
    }
  });

  it("BROWSER_LIST contains exactly all 5 profiles", () => {
    expect(BROWSER_LIST).toHaveLength(ALL_MODES.length);
    for (const mode of ALL_MODES) {
      expect(
        BROWSER_LIST.some((b) => b.id === mode),
        `BROWSER_LIST missing "${mode}"`,
      ).toBe(true);
    }
  });

  it("iOS Safari UA contains iPhone", () => {
    expect(BROWSERS["safari-ios"].ua).toContain("iPhone");
  });

  it("macOS Safari UA contains Macintosh", () => {
    expect(BROWSERS["safari-macos"].ua).toContain("Macintosh");
  });

  it("Firefox UA strings contain Gecko/", () => {
    expect(BROWSERS["firefox-android"].ua).toContain("Gecko/");
    expect(BROWSERS["firefox-desktop"].ua).toContain("Gecko/");
  });
});

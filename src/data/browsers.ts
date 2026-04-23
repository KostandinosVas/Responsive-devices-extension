import type { BrowserMode } from "../types";

export interface BrowserProfile {
  id: BrowserMode;
  label: string;
  shortLabel: string;
  ua: string;
  /** CSS class for the badge indicator */
  color: string;
  /** What this simulation does and doesn't cover */
  limitations: string[];
}

export const BROWSERS: Record<BrowserMode, BrowserProfile> = {
  chrome: {
    id: "chrome",
    label: "Chrome (default)",
    shortLabel: "Chrome",
    // Empty string = use browser's real UA (no override applied)
    ua: "",
    color: "text-green-400 bg-green-400/10 border-green-400/30",
    limitations: [],
  },
  "safari-ios": {
    id: "safari-ios",
    label: "Safari — iOS",
    shortLabel: "Safari iOS",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
    color: "text-blue-400 bg-blue-400/10 border-blue-400/30",
    limitations: [
      "Rendering engine is still Blink — visual gaps will differ from true WebKit",
      "Touch events not emulated (use DevTools for that)",
      "Date/time input appearance cannot be replicated via CSS",
      "Some Safari-specific JS APIs (e.g. AudioSession) are unavailable",
    ],
  },
  "safari-macos": {
    id: "safari-macos",
    label: "Safari — macOS",
    shortLabel: "Safari macOS",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
    color: "text-sky-400 bg-sky-400/10 border-sky-400/30",
    limitations: [
      "Rendering engine is still Blink — visual gaps will differ from true WebKit",
      "macOS-native form controls appearance not replicable",
      "Date/time picker appearance cannot be replicated",
    ],
  },
  "firefox-android": {
    id: "firefox-android",
    label: "Firefox — Android",
    shortLabel: "Firefox Android",
    ua: "Mozilla/5.0 (Android 14; Mobile; rv:124.0) Gecko/124.0 Firefox/124.0",
    color: "text-orange-400 bg-orange-400/10 border-orange-400/30",
    limitations: [
      "Rendering engine is still Blink — Gecko-specific rendering not replicated",
      "-moz- prefix behaviour approximated via CSS injection only",
      "Firefox-only JS APIs (e.g. mozRequestAnimationFrame) unavailable",
    ],
  },
  "firefox-desktop": {
    id: "firefox-desktop",
    label: "Firefox — Desktop",
    shortLabel: "Firefox",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    color: "text-orange-400 bg-orange-400/10 border-orange-400/30",
    limitations: [
      "Rendering engine is still Blink — Gecko-specific rendering not replicated",
      "Scrollbar styling approximated with CSS scrollbar-width/color",
      "-moz- prefix behaviour approximated via CSS injection only",
    ],
  },
};

export const BROWSER_LIST = Object.values(BROWSERS);

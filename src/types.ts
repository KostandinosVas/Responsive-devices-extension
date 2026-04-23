// Shared types across the extension

export type BrowserMode =
  | "chrome"
  | "safari-ios"
  | "safari-macos"
  | "firefox-android"
  | "firefox-desktop";

export type FrameVariant =
  | "iphone-dynamic-island"
  | "iphone-notch"
  | "iphone-se"
  | "android-punch"
  | "tablet-ipad"
  | "tablet-android"
  | "laptop-macbook"
  | "laptop-generic"
  | "none";

/**
 * Realistic device colour options.
 *   space-black  — nearly-black titanium/aluminium (iPhone Pro, Galaxy Ultra)
 *   midnight     — dark navy-black (iPhone 13/14/15 base, OnePlus)
 *   phantom-black— pure matte black (Samsung, Xiaomi, POCO)
 *   space-gray   — mid-grey aluminium (MacBook, iPad, Pixel Obsidian)
 *   silver       — bright silver/aluminium (MacBook Silver, iPad Silver)
 *   starlight    — warm champagne-white (iPhone SE, MacBook Starlight)
 *   white        — clean white (Galaxy Cream, Pixel Porcelain)
 *   titanium     — brushed warm titanium (iPhone 15 Pro, 16 Pro)
 */
export type FrameColor =
  | "space-black"
  | "midnight"
  | "phantom-black"
  | "space-gray"
  | "silver"
  | "starlight"
  | "white"
  | "titanium";

export interface DevicePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  category: "mobile" | "tablet" | "desktop" | "custom";
  pixelRatio?: number;
  defaultBrowser?: BrowserMode;
  frame?: FrameVariant;
  frameColor?: FrameColor;
}

export interface ViewerState {
  url: string;
  deviceId: string;
  browserMode: BrowserMode;
  customWidth: number;
  customHeight: number;
  zoom: number;
  showFrame: boolean;
  theme: "dark" | "light";
  background: string | null;
}

export type ExtMessage =
  | { type: "OPEN_VIEWER"; url: string }
  | { type: "VIEWER_READY" }
  | { type: "NAVIGATE"; url: string }
  | { type: "SET_BROWSER_MODE"; mode: BrowserMode; ua: string }
  | {
      type: "INJECT_SIM_CSS";
      browserMode: BrowserMode;
      css: string;
      frameId?: number;
    };

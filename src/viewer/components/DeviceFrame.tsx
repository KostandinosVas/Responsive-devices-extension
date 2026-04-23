/**
 * DeviceFrame
 *
 * Renders a realistic device bezel around the viewport.
 * Supports mobile, tablet and laptop variants with 8 colour themes:
 *   space-black · midnight · phantom-black · space-gray
 *   silver · starlight · white · titanium
 *
 * All measurements are in device logical pixels; multiply by `zoom` for CSS px.
 */
import React from "react";
import type { FrameVariant, FrameColor } from "../../types";

// ── Geometry ──────────────────────────────────────────────────────────────────
interface FrameConfig {
  top: number;
  bottom: number;
  side: number;
  outerR: number;
  screenR: number;
}

const CONFIGS: Record<FrameVariant, FrameConfig> = {
  "iphone-dynamic-island": {
    top: 16,
    bottom: 34,
    side: 13,
    outerR: 52,
    screenR: 42,
  },
  "iphone-notch": { top: 16, bottom: 34, side: 13, outerR: 50, screenR: 40 },
  "iphone-se": { top: 70, bottom: 82, side: 17, outerR: 16, screenR: 4 },
  "android-punch": { top: 12, bottom: 14, side: 11, outerR: 44, screenR: 32 },
  "tablet-ipad": { top: 20, bottom: 20, side: 24, outerR: 22, screenR: 12 },
  "tablet-android": { top: 16, bottom: 16, side: 18, outerR: 16, screenR: 8 },
  "laptop-macbook": { top: 20, bottom: 12, side: 16, outerR: 10, screenR: 4 },
  "laptop-generic": { top: 18, bottom: 10, side: 14, outerR: 8, screenR: 2 },
  none: { top: 0, bottom: 0, side: 0, outerR: 0, screenR: 0 },
};

// Extra horizontal space for side-button protrusion (mobile/tablet only)
const BTN_JUT = 4;

// Laptop decoration dimensions (logical px)
const LAPTOP_HINGE_H = 4;
const LAPTOP_BASE_H = 28;
const LAPTOP_BASE_XTRA_W = 16; // base extends past lid on each side

// ── Colour system ─────────────────────────────────────────────────────────────
interface ColorTokens {
  isDark: boolean;
  bodyGrad: string;
  glowRgba: string;
  /** inset top-edge highlight */
  topSheen: string;
  /** outer 1-px border */
  outerBorder: string;
  /** fill for iphone-notch bump (matches body top) */
  notchFill: string;
  /** sheen overlay opacity 0‥1 */
  sheenOpacity: number;
  btnGrad: (dir: "left" | "right") => string;
  btnEdge: (dir: "left" | "right") => string;
}

const COLORS: Record<FrameColor, ColorTokens> = {
  "space-black": {
    isDark: true,
    bodyGrad: "linear-gradient(165deg,#2c2a2c 0%,#1a1819 55%,#232122 100%)",
    glowRgba: "rgba(110,140,200,0.10)",
    topSheen: "rgba(255,255,255,0.22)",
    outerBorder: "rgba(0,0,0,0.80)",
    notchFill: "#252326",
    sheenOpacity: 0.09,
    btnGrad: (d) =>
      d === "left"
        ? "linear-gradient(to left,#2e2c2e,#1e1c1e)"
        : "linear-gradient(to right,#2e2c2e,#1e1c1e)",
    btnEdge: (d) =>
      d === "left"
        ? "-1px 0 0 rgba(255,255,255,0.07),inset 0 1px 0 rgba(255,255,255,0.08)"
        : "1px 0 0 rgba(255,255,255,0.07),inset 0 1px 0 rgba(255,255,255,0.08)",
  },
  midnight: {
    isDark: true,
    bodyGrad: "linear-gradient(165deg,#272a38 0%,#1a1c28 55%,#222535 100%)",
    glowRgba: "rgba(100,120,220,0.12)",
    topSheen: "rgba(255,255,255,0.20)",
    outerBorder: "rgba(0,0,0,0.80)",
    notchFill: "#272a38",
    sheenOpacity: 0.08,
    btnGrad: (d) =>
      d === "left"
        ? "linear-gradient(to left,#2b2e3c,#1e2030)"
        : "linear-gradient(to right,#2b2e3c,#1e2030)",
    btnEdge: (d) =>
      d === "left"
        ? "-1px 0 0 rgba(255,255,255,0.07),inset 0 1px 0 rgba(255,255,255,0.08)"
        : "1px 0 0 rgba(255,255,255,0.07),inset 0 1px 0 rgba(255,255,255,0.08)",
  },
  "phantom-black": {
    isDark: true,
    bodyGrad: "linear-gradient(165deg,#252525 0%,#181818 55%,#1e1e1e 100%)",
    glowRgba: "rgba(60,200,130,0.09)",
    topSheen: "rgba(255,255,255,0.18)",
    outerBorder: "rgba(0,0,0,0.85)",
    notchFill: "#222222",
    sheenOpacity: 0.07,
    btnGrad: (d) =>
      d === "left"
        ? "linear-gradient(to left,#282828,#1a1a1a)"
        : "linear-gradient(to right,#282828,#1a1a1a)",
    btnEdge: (d) =>
      d === "left"
        ? "-1px 0 0 rgba(255,255,255,0.06),inset 0 1px 0 rgba(255,255,255,0.07)"
        : "1px 0 0 rgba(255,255,255,0.06),inset 0 1px 0 rgba(255,255,255,0.07)",
  },
  "space-gray": {
    isDark: true,
    bodyGrad: "linear-gradient(165deg,#545456 0%,#414143 55%,#4a4a4c 100%)",
    glowRgba: "rgba(100,140,180,0.10)",
    topSheen: "rgba(255,255,255,0.28)",
    outerBorder: "rgba(0,0,0,0.70)",
    notchFill: "#4e4e50",
    sheenOpacity: 0.11,
    btnGrad: (d) =>
      d === "left"
        ? "linear-gradient(to left,#505052,#404042)"
        : "linear-gradient(to right,#505052,#404042)",
    btnEdge: (d) =>
      d === "left"
        ? "-1px 0 0 rgba(255,255,255,0.10),inset 0 1px 0 rgba(255,255,255,0.12)"
        : "1px 0 0 rgba(255,255,255,0.10),inset 0 1px 0 rgba(255,255,255,0.12)",
  },
  silver: {
    isDark: false,
    bodyGrad: "linear-gradient(165deg,#dcdee0 0%,#c8cacc 55%,#d4d6d8 100%)",
    glowRgba: "rgba(180,200,220,0.12)",
    topSheen: "rgba(255,255,255,0.55)",
    outerBorder: "rgba(0,0,0,0.28)",
    notchFill: "#d8dadc",
    sheenOpacity: 0.28,
    btnGrad: (d) =>
      d === "left"
        ? "linear-gradient(to left,#c4c6c8,#b8babc)"
        : "linear-gradient(to right,#c4c6c8,#b8babc)",
    btnEdge: (d) =>
      d === "left"
        ? "-1px 0 0 rgba(0,0,0,0.14),inset 0 1px 0 rgba(255,255,255,0.60)"
        : "1px 0 0 rgba(0,0,0,0.14),inset 0 1px 0 rgba(255,255,255,0.60)",
  },
  starlight: {
    isDark: false,
    bodyGrad: "linear-gradient(165deg,#f2ede6 0%,#e0dbd3 55%,#eae5de 100%)",
    glowRgba: "rgba(210,200,185,0.12)",
    topSheen: "rgba(255,255,255,0.65)",
    outerBorder: "rgba(0,0,0,0.20)",
    notchFill: "#ede8e2",
    sheenOpacity: 0.32,
    btnGrad: (d) =>
      d === "left"
        ? "linear-gradient(to left,#d4cfc8,#c8c4bc)"
        : "linear-gradient(to right,#d4cfc8,#c8c4bc)",
    btnEdge: (d) =>
      d === "left"
        ? "-1px 0 0 rgba(0,0,0,0.10),inset 0 1px 0 rgba(255,255,255,0.70)"
        : "1px 0 0 rgba(0,0,0,0.10),inset 0 1px 0 rgba(255,255,255,0.70)",
  },
  white: {
    isDark: false,
    bodyGrad: "linear-gradient(165deg,#f6f6f6 0%,#eceaea 55%,#f2f2f2 100%)",
    glowRgba: "rgba(200,210,220,0.10)",
    topSheen: "rgba(255,255,255,0.70)",
    outerBorder: "rgba(0,0,0,0.18)",
    notchFill: "#f4f4f4",
    sheenOpacity: 0.3,
    btnGrad: (d) =>
      d === "left"
        ? "linear-gradient(to left,#dcdcdc,#d0d0d0)"
        : "linear-gradient(to right,#dcdcdc,#d0d0d0)",
    btnEdge: (d) =>
      d === "left"
        ? "-1px 0 0 rgba(0,0,0,0.10),inset 0 1px 0 rgba(255,255,255,0.70)"
        : "1px 0 0 rgba(0,0,0,0.10),inset 0 1px 0 rgba(255,255,255,0.70)",
  },
  titanium: {
    isDark: true,
    bodyGrad: "linear-gradient(165deg,#a09e90 0%,#8a887c 55%,#929080 100%)",
    glowRgba: "rgba(160,155,140,0.10)",
    topSheen: "rgba(255,255,255,0.30)",
    outerBorder: "rgba(0,0,0,0.48)",
    notchFill: "#9c9a8c",
    sheenOpacity: 0.14,
    btnGrad: (d) =>
      d === "left"
        ? "linear-gradient(to left,#989688,#848276)"
        : "linear-gradient(to right,#989688,#848276)",
    btnEdge: (d) =>
      d === "left"
        ? "-1px 0 0 rgba(255,255,255,0.12),inset 0 1px 0 rgba(255,255,255,0.20)"
        : "1px 0 0 rgba(255,255,255,0.12),inset 0 1px 0 rgba(255,255,255,0.20)",
  },
};

// Android chrome bar height (logical px)
const ANDROID_BAR_H = 56;
// iPhone status bar heights (logical px) — matches iOS safe-area-inset-top
const IPHONE_STATUS_H: Partial<Record<FrameVariant, number>> = {
  "iphone-dynamic-island": 54,
  "iphone-notch": 44,
};

/**
 * Returns the height (in logical px) of the decorative UI bar rendered
 * at the top of the screen area for a given frame variant.
 * Callers should reduce the viewport height by this amount so the iframe
 * fills exactly the available content area and no content is clipped.
 */
export const FRAME_UI_BAR_H: Partial<Record<FrameVariant, number>> = {
  "iphone-dynamic-island": IPHONE_STATUS_H["iphone-dynamic-island"],
  "iphone-notch": IPHONE_STATUS_H["iphone-notch"],
  "android-punch": ANDROID_BAR_H,
};

function getDisplayUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== "/" ? u.pathname : "");
  } catch {
    return url;
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  frameStyle: FrameVariant;
  frameColor?: FrameColor;
  zoom: number;
  deviceWidth: number;
  deviceHeight: number;
  url?: string;
  children: React.ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function DeviceFrame({
  frameStyle,
  frameColor = "space-black",
  zoom: z,
  deviceWidth: dw,
  deviceHeight: dh,
  url = "",
  children,
}: Props) {
  // ── No-frame fast path ──────────────────────────────────────────────────
  if (frameStyle === "none") {
    return (
      <div
        style={{
          borderRadius: 4,
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        {children}
      </div>
    );
  }

  const cfg = CONFIGS[frameStyle];
  const ct = COLORS[frameColor];

  // ── Shared shadow helpers ────────────────────────────────────────────────
  const innerHL = ct.isDark
    ? "rgba(255,255,255,0.13)"
    : "rgba(255,255,255,0.55)";
  const innerBot = ct.isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.12)";
  const drop1 = ct.isDark ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.22)";
  const drop2 = ct.isDark ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.12)";
  const screenEdgeShadow = ct.isDark
    ? "inset 0 0 0 1px rgba(0,0,0,0.7),inset 0 2px 8px rgba(0,0,0,0.55)"
    : "inset 0 0 0 1px rgba(0,0,0,0.22),inset 0 1px 4px rgba(0,0,0,0.22)";
  const cameraDotBg = ct.isDark ? "#101012" : "#181818";

  function outerShadow(r: number): string {
    return [
      `inset 0 0 0 1px ${innerHL}`,
      `inset 0 1px 0 ${ct.topSheen}`,
      `inset 0 -1px 0 ${innerBot}`,
      `0 0 0 1px ${ct.outerBorder}`,
      `0 ${10 * z}px ${38 * z}px ${drop1}`,
      `0 ${26 * z}px ${76 * z}px ${drop2}`,
      `0 0 ${110 * z}px ${ct.glowRgba}`,
    ].join(",");
  }

  // ── Laptop branch ──────────────────────────────────────────────────────
  if (frameStyle === "laptop-macbook" || frameStyle === "laptop-generic") {
    const isMac = frameStyle === "laptop-macbook";
    const lidW = (dw + cfg.side * 2) * z;
    const lidH = (dh + cfg.top + cfg.bottom) * z;
    const baseW = lidW + LAPTOP_BASE_XTRA_W * 2 * z;
    const hingeH = LAPTOP_HINGE_H * z;
    const baseH = LAPTOP_BASE_H * z;
    const baseR = (isMac ? 7 : 5) * z;
    const lidR = `${cfg.outerR * z}px ${cfg.outerR * z}px ${3 * z}px ${3 * z}px`;
    const hingeGrad = ct.isDark
      ? "linear-gradient(to bottom,rgba(0,0,0,0.40) 0%,rgba(0,0,0,0.20) 100%)"
      : "linear-gradient(to bottom,rgba(0,0,0,0.18) 0%,rgba(0,0,0,0.07) 100%)";
    const dotClr = ct.isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {/* Lid */}
        <div
          style={{
            position: "relative",
            width: lidW,
            height: lidH,
            background: ct.bodyGrad,
            borderRadius: lidR,
            boxShadow: outerShadow(cfg.outerR),
            flexShrink: 0,
          }}
        >
          {/* Screen */}
          <div
            style={{
              position: "absolute",
              left: cfg.side * z,
              top: cfg.top * z,
              width: dw * z,
              height: dh * z,
              borderRadius: cfg.screenR * z,
              overflow: "hidden",
              background: "#000",
              boxShadow: screenEdgeShadow,
              zIndex: 1,
            }}
          >
            {children}
          </div>

          {/* Camera */}
          <div
            style={{
              position: "absolute",
              zIndex: 2,
              top: cfg.top * 0.48 * z,
              left: "50%",
              transform: "translateX(-50%)",
              width: 8 * z,
              height: 8 * z,
              background: cameraDotBg,
              borderRadius: "50%",
              boxShadow: ct.isDark
                ? "0 0 0 1.5px rgba(255,255,255,0.05),inset 0 0 0 2px rgba(80,160,255,0.28)"
                : "0 0 0 1.5px rgba(0,0,0,0.12),inset 0 0 0 2px rgba(80,160,255,0.22)",
            }}
          />

          {/* Lid sheen */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: lidR,
              background: `linear-gradient(175deg,rgba(255,255,255,${ct.sheenOpacity * 1.5}) 0%,transparent 35%,rgba(255,255,255,${ct.sheenOpacity * 0.3}) 100%)`,
              pointerEvents: "none",
              zIndex: 4,
            }}
          />
        </div>

        {/* Hinge strip */}
        <div
          style={{
            width: baseW,
            height: hingeH,
            background: hingeGrad,
            flexShrink: 0,
          }}
        />

        {/* Keyboard deck */}
        <div
          style={{
            position: "relative",
            width: baseW,
            height: baseH,
            background: ct.bodyGrad,
            borderRadius: `0 0 ${baseR}px ${baseR}px`,
            boxShadow: [
              `inset 0 0 0 1px ${innerHL}`,
              `inset 0 -1px 0 ${innerBot}`,
              `0 0 0 1px ${ct.outerBorder}`,
              `0 ${8 * z}px ${28 * z}px ${drop1}`,
              `0 0 ${80 * z}px ${ct.glowRgba}`,
            ].join(","),
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {/* Top sheen on deck */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(to bottom,rgba(255,255,255,${ct.sheenOpacity}) 0%,transparent 60%)`,
              pointerEvents: "none",
            }}
          />

          {/* Speaker dots — left */}
          <div
            style={{
              position: "absolute",
              left: 12 * z,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              gap: 3 * z,
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  width: 2.5 * z,
                  height: 2.5 * z,
                  borderRadius: "50%",
                  background: dotClr,
                }}
              />
            ))}
          </div>

          {/* Speaker dots — right */}
          <div
            style={{
              position: "absolute",
              right: 12 * z,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              gap: 3 * z,
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  width: 2.5 * z,
                  height: 2.5 * z,
                  borderRadius: "50%",
                  background: dotClr,
                }}
              />
            ))}
          </div>

          {/* Trackpad hint */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
              width: (isMac ? 80 : 60) * z,
              height: (isMac ? 14 : 12) * z,
              borderRadius: (isMac ? 4 : 3) * z,
              background: ct.isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.06)",
              boxShadow: ct.isDark
                ? "inset 0 0 0 1px rgba(255,255,255,0.08)"
                : "inset 0 0 0 1px rgba(0,0,0,0.10)",
            }}
          />
        </div>
      </div>
    );
  }

  // ── Mobile / Tablet ────────────────────────────────────────────────────
  const outerW = (dw + cfg.side * 2) * z;
  const outerH = (dh + cfg.top + cfg.bottom) * z;

  const leftBtnStyle = (
    topOffset: number,
    height: number,
  ): React.CSSProperties => ({
    position: "absolute",
    top: topOffset * z,
    left: -BTN_JUT * z,
    width: BTN_JUT * z,
    height: height * z,
    background: ct.btnGrad("left"),
    borderRadius: `${2 * z}px 0 0 ${2 * z}px`,
    boxShadow: ct.btnEdge("left"),
    zIndex: 0,
  });

  const rightBtnStyle = (
    topOffset: number,
    height: number,
  ): React.CSSProperties => ({
    position: "absolute",
    top: topOffset * z,
    right: -BTN_JUT * z,
    width: BTN_JUT * z,
    height: height * z,
    background: ct.btnGrad("right"),
    borderRadius: `0 ${2 * z}px ${2 * z}px 0`,
    boxShadow: ct.btnEdge("right"),
    zIndex: 0,
  });

  type ButtonDef = {
    side: "left" | "right";
    topOffset: number;
    height: number;
  };

  const BUTTONS: Record<FrameVariant, ButtonDef[]> = {
    "iphone-dynamic-island": [
      { side: "left", topOffset: cfg.top + 22, height: 14 },
      { side: "left", topOffset: cfg.top + 58, height: 26 },
      { side: "left", topOffset: cfg.top + 97, height: 26 },
      { side: "right", topOffset: cfg.top + 68, height: 38 },
    ],
    "iphone-notch": [
      { side: "left", topOffset: cfg.top + 22, height: 14 },
      { side: "left", topOffset: cfg.top + 58, height: 26 },
      { side: "left", topOffset: cfg.top + 97, height: 26 },
      { side: "right", topOffset: cfg.top + 68, height: 38 },
    ],
    "iphone-se": [
      { side: "left", topOffset: cfg.top + 20, height: 12 },
      { side: "left", topOffset: cfg.top + 52, height: 22 },
      { side: "left", topOffset: cfg.top + 84, height: 22 },
      { side: "right", topOffset: cfg.top + 60, height: 32 },
    ],
    "android-punch": [
      { side: "left", topOffset: cfg.top + 48, height: 22 },
      { side: "left", topOffset: cfg.top + 80, height: 22 },
      { side: "right", topOffset: cfg.top + 58, height: 32 },
    ],
    "tablet-ipad": [
      { side: "right", topOffset: cfg.top + 30, height: 14 },
      { side: "right", topOffset: cfg.top + 60, height: 20 },
      { side: "right", topOffset: cfg.top + 90, height: 20 },
    ],
    "tablet-android": [
      { side: "right", topOffset: cfg.top + 24, height: 14 },
      { side: "right", topOffset: cfg.top + 56, height: 22 },
    ],
    "laptop-macbook": [],
    "laptop-generic": [],
    none: [],
  };

  const buttons = BUTTONS[frameStyle] ?? [];

  // Home-button / decoration tokens derived from color
  const homeGrad = ct.isDark
    ? "linear-gradient(145deg,#2e2e30,#1a1a1c)"
    : `linear-gradient(145deg,${ct.bodyGrad.match(/#[0-9a-f]{6}/gi)?.[0] ?? "#ccc"},${ct.bodyGrad.match(/#[0-9a-f]{6}/gi)?.[1] ?? "#bbb"})`;
  const homeHL1 = ct.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const homeHL2 = ct.isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const homeIcon = ct.isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)";
  const earpieceBg = ct.isDark ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.18)";
  const homeIndBar = ct.isDark ? "rgba(255,255,255,0.26)" : "rgba(0,0,0,0.20)";

  return (
    <div
      style={{
        position: "relative",
        paddingLeft: BTN_JUT * z,
        paddingRight: BTN_JUT * z,
        flexShrink: 0,
        display: "inline-block",
      }}
    >
      {/* ── Device body ──────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          width: outerW,
          height: outerH,
          background: ct.bodyGrad,
          borderRadius: cfg.outerR * z,
          boxShadow: outerShadow(cfg.outerR),
          flexShrink: 0,
        }}
      >
        {/* Side buttons */}
        {buttons.map((btn, i) =>
          btn.side === "left" ? (
            <div key={i} style={leftBtnStyle(btn.topOffset, btn.height)} />
          ) : (
            <div key={i} style={rightBtnStyle(btn.topOffset, btn.height)} />
          ),
        )}

        {/* Sheen overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: cfg.outerR * z,
            background: `linear-gradient(170deg,rgba(255,255,255,${ct.sheenOpacity}) 0%,transparent 38%,rgba(255,255,255,${ct.sheenOpacity * 0.3}) 100%)`,
            pointerEvents: "none",
            zIndex: 4,
          }}
        />

        {/* Screen */}
        <div
          style={{
            position: "absolute",
            left: cfg.side * z,
            top: cfg.top * z,
            width: dw * z,
            height: dh * z,
            borderRadius: cfg.screenR * z,
            overflow: "hidden",
            background: "#000",
            boxShadow: screenEdgeShadow,
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* iPhone status bar — provides safe-area spacing so content isn't hidden behind notch/DI */}
          {(frameStyle === "iphone-dynamic-island" || frameStyle === "iphone-notch") && (() => {
            const barH = (IPHONE_STATUS_H[frameStyle] ?? 44) * z;
            const fg = ct.isDark ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.88)";
            const bg = ct.isDark ? "#0b0b0c" : "#f6f6f6";
            return (
              <div
                style={{
                  width: "100%",
                  height: barH,
                  flexShrink: 0,
                  background: bg,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  paddingLeft: 26 * z,
                  paddingRight: 20 * z,
                  paddingTop: 14 * z,
                  boxSizing: "border-box",
                  pointerEvents: "none",
                  userSelect: "none",
                  borderBottom: `1px solid ${ct.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                }}
              >
                {/* Time */}
                <span
                  style={{
                    color: fg,
                    fontSize: 15 * z,
                    fontWeight: 600,
                    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
                    letterSpacing: -0.2,
                    lineHeight: 1,
                  }}
                >
                  9:41
                </span>

                {/* Right indicators: signal · wifi · battery */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 * z }}>
                  {/* Cellular signal bars */}
                  <svg width={17 * z} height={12 * z} viewBox="0 0 17 12">
                    <rect x="0"   y="8"   width="3" height="4"  rx="0.6" fill={fg} />
                    <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.6" fill={fg} />
                    <rect x="9"   y="3"   width="3" height="9"  rx="0.6" fill={fg} />
                    <rect x="13.5" y="0"  width="3" height="12" rx="0.6" fill={fg} />
                  </svg>

                  {/* WiFi */}
                  <svg width={16 * z} height={12 * z} viewBox="0 0 16 12" fill="none">
                    <circle cx="8" cy="11" r="1.5" fill={fg} />
                    <path d="M4.8 8 Q8 5.2 11.2 8" stroke={fg} strokeWidth="1.6" strokeLinecap="round" fill="none" />
                    <path d="M2 5.2 Q8 0.8 14 5.2" stroke={fg} strokeWidth="1.6" strokeLinecap="round" fill="none" />
                  </svg>

                  {/* Battery */}
                  <svg width={26 * z} height={13 * z} viewBox="0 0 26 13" fill="none">
                    <rect x="0.5" y="0.5" width="21" height="12" rx="3.5" stroke={fg} strokeWidth="1" />
                    <rect x="22" y="4"   width="3"  height="5"  rx="1.2" fill={fg} opacity="0.45" />
                    <rect x="2"  y="2"   width="15" height="9"  rx="2"   fill={fg} />
                  </svg>
                </div>
              </div>
            );
          })()}

          {/* Android browser chrome bar — rendered first so it sits ABOVE the content */}
          {frameStyle === "android-punch" && (
            <div
              style={{
                width: "100%",
                height: ANDROID_BAR_H * z,
                flexShrink: 0,
                background: "#202124",
                display: "flex",
                alignItems: "center",
                paddingLeft: 4 * z,
                paddingRight: 4 * z,
                borderBottom: `1px solid rgba(255,255,255,0.07)`,
                userSelect: "none",
                pointerEvents: "none",
                boxSizing: "border-box",
              }}
            >
              {/* Back arrow */}
              <div style={{ padding: `${8 * z}px`, flexShrink: 0 }}>
                <svg
                  width={20 * z}
                  height={20 * z}
                  viewBox="0 0 24 24"
                  fill="rgba(255,255,255,0.80)"
                >
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
              </div>

              {/* URL pill */}
              <div
                style={{
                  flex: 1,
                  height: 36 * z,
                  background: "rgba(255,255,255,0.09)",
                  borderRadius: 20 * z,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 10 * z,
                  paddingRight: 10 * z,
                  overflow: "hidden",
                  gap: 5 * z,
                  minWidth: 0,
                }}
              >
                {/* Lock icon */}
                <svg
                  width={11 * z}
                  height={11 * z}
                  viewBox="0 0 24 24"
                  fill="rgba(255,255,255,0.50)"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
                <span
                  style={{
                    color: "rgba(255,255,255,0.82)",
                    fontSize: 13 * z,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    letterSpacing: 0.1,
                    lineHeight: 1,
                  }}
                >
                  {getDisplayUrl(url)}
                </span>
              </div>

              {/* Share icon */}
              <div style={{ padding: `${8 * z}px`, flexShrink: 0 }}>
                <svg
                  width={20 * z}
                  height={20 * z}
                  viewBox="0 0 24 24"
                  fill="rgba(255,255,255,0.80)"
                >
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
                </svg>
              </div>

              {/* Three-dot menu */}
              <div style={{ padding: `${8 * z}px`, flexShrink: 0 }}>
                <svg
                  width={20 * z}
                  height={20 * z}
                  viewBox="0 0 24 24"
                  fill="rgba(255,255,255,0.80)"
                >
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </div>
            </div>
          )}

          {/* Content area — fills the remaining screen height below the chrome bar */}
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              position: "relative",
              minHeight: 0,
            }}
          >
            {children}
          </div>
        </div>

        {/* Dynamic Island */}
        {frameStyle === "iphone-dynamic-island" && (
          <div
            style={{
              position: "absolute",
              zIndex: 2,
              top: cfg.top * z + 14 * z,
              left: "50%",
              transform: "translateX(-50%)",
              width: 126 * z,
              height: 37 * z,
              background: "#000",
              borderRadius: 20 * z,
              boxShadow:
                "inset 0 0 0 1px rgba(255,255,255,0.06),0 1px 4px rgba(0,0,0,0.6)",
            }}
          />
        )}

        {/* Notch */}
        {frameStyle === "iphone-notch" && (
          <div
            style={{
              position: "absolute",
              zIndex: 2,
              top: cfg.top * z,
              left: "50%",
              transform: "translateX(-50%)",
              width: 148 * z,
              height: 30 * z,
              background: ct.notchFill,
              borderRadius: `0 0 ${22 * z}px ${22 * z}px`,
              boxShadow: ct.isDark
                ? "inset -1px 0 0 rgba(255,255,255,0.05),inset 1px 0 0 rgba(255,255,255,0.05),inset 0 -1px 0 rgba(255,255,255,0.04)"
                : "inset -1px 0 0 rgba(0,0,0,0.06),inset 1px 0 0 rgba(0,0,0,0.06),inset 0 -1px 0 rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "60%",
                transform: "translate(-50%,-50%)",
                width: 10 * z,
                height: 10 * z,
                background: cameraDotBg,
                borderRadius: "50%",
                boxShadow: "inset 0 0 0 2px rgba(80,160,255,0.25)",
              }}
            />
          </div>
        )}

        {/* iPhone SE: earpiece + camera + home button */}
        {frameStyle === "iphone-se" && (
          <>
            <div
              style={{
                position: "absolute",
                zIndex: 2,
                top: cfg.top * 0.38 * z,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6 * z,
              }}
            >
              <div
                style={{
                  width: 52 * z,
                  height: 6 * z,
                  background: earpieceBg,
                  borderRadius: 3 * z,
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9)",
                }}
              />
              <div
                style={{
                  width: 9 * z,
                  height: 9 * z,
                  background: cameraDotBg,
                  borderRadius: "50%",
                  boxShadow:
                    "inset 0 0 0 2px rgba(80,160,255,0.3),0 0 0 2px rgba(255,255,255,0.04)",
                }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                zIndex: 2,
                bottom: cfg.bottom * 0.28 * z,
                left: "50%",
                transform: "translateX(-50%)",
                width: 44 * z,
                height: 44 * z,
                borderRadius: "50%",
                background: homeGrad,
                boxShadow: [
                  `0 0 0 3px ${homeHL1}`,
                  "0 0 0 5px rgba(0,0,0,0.4)",
                  `inset 0 1px 3px ${homeHL2}`,
                  "0 3px 8px rgba(0,0,0,0.55)",
                ].join(","),
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "30%",
                  borderRadius: "28%",
                  border: `${1 * z}px solid ${homeIcon}`,
                }}
              />
            </div>
          </>
        )}

        {/* Android punch-hole */}
        {frameStyle === "android-punch" && (
          <div
            style={{
              position: "absolute",
              zIndex: 2,
              top: cfg.top * z + 16 * z,
              left: "50%",
              transform: "translateX(-50%)",
              width: 12 * z,
              height: 12 * z,
              background: "#000",
              borderRadius: "50%",
              boxShadow: `0 0 0 1.5px ${ct.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)"},inset 0 0 0 2px rgba(70,150,255,0.22)`,
            }}
          />
        )}

        {/* Tablet camera */}
        {(frameStyle === "tablet-ipad" || frameStyle === "tablet-android") && (
          <div
            style={{
              position: "absolute",
              zIndex: 2,
              top: cfg.top * 0.48 * z,
              left: "50%",
              transform: "translateX(-50%)",
              width: 10 * z,
              height: 10 * z,
              background: cameraDotBg,
              borderRadius: "50%",
              boxShadow: ct.isDark
                ? "0 0 0 2px rgba(255,255,255,0.05),inset 0 0 0 2px rgba(100,180,255,0.28)"
                : "0 0 0 2px rgba(0,0,0,0.10),inset 0 0 0 2px rgba(100,180,255,0.22)",
            }}
          />
        )}

        {/* Home indicator bar */}
        {(frameStyle === "iphone-dynamic-island" ||
          frameStyle === "iphone-notch") && (
          <div
            style={{
              position: "absolute",
              zIndex: 2,
              bottom: cfg.bottom * 0.27 * z,
              left: "50%",
              transform: "translateX(-50%)",
              width: 134 * z,
              height: 5 * z,
              background: homeIndBar,
              borderRadius: 3 * z,
            }}
          />
        )}
      </div>
    </div>
  );
}

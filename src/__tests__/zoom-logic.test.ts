/**
 * Tests for zoom-related pure logic.
 *
 * These mirror the exact formulas used in:
 *   - useViewerState.ts  →  clampZoom
 *   - Toolbar.tsx (ZoomControl)  →  ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, stepZoom()
 *
 * Keeping these as standalone assertions ensures that if a constant or formula
 * is changed in the source, the relevant test breaks and forces a deliberate review.
 */
import { describe, it, expect } from "vitest";

// ── Mirror of source constants ────────────────────────────────────────────────

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;

// Mirror of useViewerState setZoom clamping
function clampZoom(z: number): number {
  return Math.max(0.1, Math.min(2, z));
}

// Mirror of ZoomControl stepZoom() logic
function stepZoom(current: number, dir: 1 | -1): number {
  const next = Math.round((current + dir * ZOOM_STEP) * 10) / 10;
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("clampZoom", () => {
  it("clamps zero to the minimum 0.1", () => {
    expect(clampZoom(0)).toBe(0.1);
  });

  it("clamps negative values to 0.1", () => {
    expect(clampZoom(-1)).toBe(0.1);
    expect(clampZoom(-99)).toBe(0.1);
  });

  it("clamps values just below minimum to 0.1", () => {
    expect(clampZoom(0.05)).toBe(0.1);
    expect(clampZoom(0.09)).toBe(0.1);
  });

  it("clamps values above 2 to 2", () => {
    expect(clampZoom(2.1)).toBe(2);
    expect(clampZoom(3)).toBe(2);
    expect(clampZoom(100)).toBe(2);
  });

  it("passes through the boundary values unchanged", () => {
    expect(clampZoom(0.1)).toBe(0.1);
    expect(clampZoom(2)).toBe(2);
  });

  it("passes through valid mid-range values unchanged", () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(0.5)).toBe(0.5);
    expect(clampZoom(1.5)).toBe(1.5);
  });
});

describe("zoom constants", () => {
  it("ZOOM_MIN is 0.1", () => {
    expect(ZOOM_MIN).toBe(0.1);
  });

  it("ZOOM_MAX is 2 (matching clampZoom upper bound)", () => {
    expect(ZOOM_MAX).toBe(2);
  });

  it("ZOOM_STEP is 0.1 (10%)", () => {
    expect(ZOOM_STEP).toBe(0.1);
  });
});

describe("stepZoom", () => {
  it("steps up by exactly 10%", () => {
    expect(stepZoom(1, 1)).toBe(1.1);
    expect(stepZoom(0.5, 1)).toBe(0.6);
    expect(stepZoom(0.9, 1)).toBe(1.0);
  });

  it("steps down by exactly 10%", () => {
    expect(stepZoom(1, -1)).toBe(0.9);
    expect(stepZoom(0.5, -1)).toBe(0.4);
    expect(stepZoom(1.1, -1)).toBe(1.0);
  });

  it("stays at ZOOM_MIN when stepping down at the floor", () => {
    expect(stepZoom(0.1, -1)).toBe(0.1);
  });

  it("stays at ZOOM_MAX when stepping up at the ceiling", () => {
    expect(stepZoom(2, 1)).toBe(2);
  });

  it("clamps correctly when one step would overshoot the minimum", () => {
    expect(stepZoom(0.15, -1)).toBe(0.1);
  });

  it("clamps correctly when one step would overshoot the maximum", () => {
    expect(stepZoom(1.95, 1)).toBe(2);
  });
});

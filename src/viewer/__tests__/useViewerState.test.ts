/**
 * Tests for the useViewerState hook.
 *
 * chrome.storage.local is mocked globally (see setup.ts). Per-test overrides
 * are done with mockImplementation to simulate stored data.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useViewerState } from "../useViewerState";

// Convenience cast so TS knows get is a mock
const storageMock = () => chrome.storage.local.get as ReturnType<typeof vi.fn>;

describe("useViewerState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: empty storage
    storageMock().mockImplementation(
      (_key: string, cb: (r: Record<string, unknown>) => void) => cb({}),
    );
  });

  // ── Initial state ────────────────────────────────────────────────────────

  it("exposes loaded=true after mount", async () => {
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));
  });

  it("defaults to iphone-14 device", async () => {
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.state.deviceId).toBe("iphone-14");
  });

  it("defaults to safari-ios browser mode", async () => {
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.state.browserMode).toBe("safari-ios");
  });

  it("defaults to zoom 1", async () => {
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.state.zoom).toBe(1);
  });

  it("always uses the URL from the query param, ignoring any stored url", async () => {
    storageMock().mockImplementation(
      (_key: string, cb: (r: Record<string, unknown>) => void) =>
        cb({ forma_viewer_state: { url: "https://stored.com" } }),
    );
    const { result } = renderHook(() =>
      useViewerState("https://passed-in.com"),
    );
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.state.url).toBe("https://passed-in.com");
  });

  // ── Persisted state restore ──────────────────────────────────────────────

  it("restores persisted zoom from storage", async () => {
    storageMock().mockImplementation(
      (_key: string, cb: (r: Record<string, unknown>) => void) =>
        cb({ forma_viewer_state: { zoom: 0.75 } }),
    );
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.state.zoom).toBe(0.75);
  });

  it("restores persisted deviceId, browserMode, and custom dimensions", async () => {
    storageMock().mockImplementation(
      (_key: string, cb: (r: Record<string, unknown>) => void) =>
        cb({
          forma_viewer_state: {
            deviceId: "custom",
            browserMode: "firefox-desktop",
            customWidth: 1280,
            customHeight: 720,
            zoom: 1,
          },
        }),
    );
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.state.deviceId).toBe("custom");
    expect(result.current.state.browserMode).toBe("firefox-desktop");
    expect(result.current.state.customWidth).toBe(1280);
    expect(result.current.state.customHeight).toBe(720);
  });

  // ── setZoom ───────────────────────────────────────────────────────────────

  it("setZoom updates state to the given value", async () => {
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.setZoom(1.5));
    expect(result.current.state.zoom).toBe(1.5);
  });

  it("setZoom clamps values below 0.1 to 0.1", async () => {
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.setZoom(0));
    expect(result.current.state.zoom).toBe(0.1);

    act(() => result.current.setZoom(-5));
    expect(result.current.state.zoom).toBe(0.1);
  });

  it("setZoom clamps values above 2 to 2", async () => {
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.setZoom(3));
    expect(result.current.state.zoom).toBe(2);

    act(() => result.current.setZoom(100));
    expect(result.current.state.zoom).toBe(2);
  });

  it("setZoom accepts boundary values exactly", async () => {
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.setZoom(0.1));
    expect(result.current.state.zoom).toBe(0.1);

    act(() => result.current.setZoom(2));
    expect(result.current.state.zoom).toBe(2);
  });

  // ── setUrl ────────────────────────────────────────────────────────────────

  it("setUrl updates the current URL", async () => {
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.setUrl("https://new-site.com"));
    expect(result.current.state.url).toBe("https://new-site.com");
  });

  // ── setDevice ─────────────────────────────────────────────────────────────

  it("setDevice updates deviceId, width, height, and defaults browserMode", async () => {
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.setDevice("pixel-7"));
    expect(result.current.state.deviceId).toBe("pixel-7");
    expect(result.current.state.browserMode).toBe("chrome"); // pixel-7.defaultBrowser
    expect(result.current.width).toBe(412);
    expect(result.current.height).toBe(915);
  });

  it("setDevice keeps existing browserMode when device has no defaultBrowser", async () => {
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    act(() => result.current.setBrowserMode("firefox-desktop"));

    // "custom" device has no defaultBrowser set
    act(() => result.current.setDevice("custom"));
    expect(result.current.state.browserMode).toBe("firefox-desktop");
  });

  it("setDevice ignores unknown device ids", async () => {
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    const before = { ...result.current.state };

    act(() => result.current.setDevice("this-does-not-exist"));
    expect(result.current.state.deviceId).toBe(before.deviceId);
  });

  // ── setCustomDimensions ───────────────────────────────────────────────────

  it("setCustomDimensions sets deviceId to 'custom'", async () => {
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.setCustomDimensions(1024, 768));
    expect(result.current.state.deviceId).toBe("custom");
    expect(result.current.state.customWidth).toBe(1024);
    expect(result.current.state.customHeight).toBe(768);
  });

  it("setCustomDimensions updates the returned width and height", async () => {
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.setCustomDimensions(800, 600));
    expect(result.current.width).toBe(800);
    expect(result.current.height).toBe(600);
  });

  // ── setBrowserMode ────────────────────────────────────────────────────────

  it("setBrowserMode updates state.browserMode", async () => {
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.setBrowserMode("firefox-desktop"));
    expect(result.current.state.browserMode).toBe("firefox-desktop");
  });

  it("setBrowserMode sends SET_BROWSER_MODE message to background", async () => {
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.setBrowserMode("safari-macos"));
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SET_BROWSER_MODE",
        mode: "safari-macos",
      }),
    );
  });

  // ── Persistence ───────────────────────────────────────────────────────────

  it("persists state to chrome.storage.local after changes", async () => {
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.setZoom(0.5));
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        forma_viewer_state: expect.objectContaining({ zoom: 0.5 }),
      }),
    );
  });

  // ── Derived values ────────────────────────────────────────────────────────

  it("width and height reflect active device's dimensions", async () => {
    const { result } = renderHook(() => useViewerState("https://example.com"));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    // Default device is iphone-14: 390×844
    expect(result.current.width).toBe(390);
    expect(result.current.height).toBe(844);
  });
});

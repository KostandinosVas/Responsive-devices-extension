/**
 * useViewerState — manages all viewer state with chrome.storage.local persistence.
 */
import { useState, useEffect, useCallback } from "react";
import type { BrowserMode, ViewerState } from "../types";
import { BROWSERS } from "../data/browsers";
import { DEVICE_MAP } from "../data/devices";

const STORAGE_KEY = "forma_viewer_state";

function getDefaultState(url: string): ViewerState {
  return {
    url,
    deviceId: "iphone-14",
    browserMode: "safari-ios",
    customWidth: 390,
    customHeight: 844,
    zoom: 1,
    showFrame: true,
    theme: "dark",
    background: null,
  };
}

export function useViewerState(initialUrl: string) {
  const [state, setState] = useState<ViewerState>(() =>
    getDefaultState(initialUrl),
  );
  const [loaded, setLoaded] = useState(false);

  // Load persisted state on mount
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const saved = result[STORAGE_KEY] as Partial<ViewerState> | undefined;
      if (saved) {
        setState({
          ...getDefaultState(initialUrl),
          ...saved,
          url: initialUrl, // always use the URL from the query param
        });
      }
      setLoaded(true);
    });
  }, [initialUrl]);

  // Persist state changes
  useEffect(() => {
    if (!loaded) return;
    chrome.storage.local.set({ [STORAGE_KEY]: state });
  }, [state, loaded]);

  const setUrl = useCallback((url: string) => {
    setState((s) => ({ ...s, url }));
  }, []);

  const setDevice = useCallback((deviceId: string) => {
    const device = DEVICE_MAP[deviceId];
    if (!device) return;
    setState((s) => {
      const nextMode: BrowserMode = device.defaultBrowser ?? s.browserMode;
      return {
        ...s,
        deviceId,
        customWidth: device.width,
        customHeight: device.height,
        browserMode: nextMode,
      };
    });
  }, []);

  const setBrowserMode = useCallback((mode: BrowserMode) => {
    setState((s) => ({ ...s, browserMode: mode }));
    // Notify background to update UA DNR rule
    const ua = BROWSERS[mode].ua || navigator.userAgent;
    chrome.runtime.sendMessage({ type: "SET_BROWSER_MODE", mode, ua });
  }, []);

  const setCustomDimensions = useCallback((width: number, height: number) => {
    setState((s) => ({
      ...s,
      deviceId: "custom",
      customWidth: width,
      customHeight: height,
    }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState((s) => ({ ...s, zoom: Math.max(0.1, Math.min(2, zoom)) }));
  }, []);

  const toggleFrame = useCallback(() => {
    setState((s) => ({ ...s, showFrame: !s.showFrame }));
  }, []);

  const toggleTheme = useCallback(() => {
    setState((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }));
  }, []);

  const setBackground = useCallback((bg: string | null) => {
    setState((s) => ({ ...s, background: bg }));
  }, []);

  const currentDevice = DEVICE_MAP[state.deviceId] ?? DEVICE_MAP["custom"];
  const width =
    state.deviceId === "custom" ? state.customWidth : currentDevice.width;
  const height =
    state.deviceId === "custom" ? state.customHeight : currentDevice.height;

  return {
    state,
    loaded,
    width,
    height,
    currentDevice,
    setUrl,
    setDevice,
    setBrowserMode,
    setCustomDimensions,
    setZoom,
    toggleFrame,
    toggleTheme,
    setBackground,
  };
}

import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Toolbar } from "./components/Toolbar";
import { ViewportFrame } from "./components/ViewportFrame";
import { DeviceFrame, FRAME_UI_BAR_H } from "./components/DeviceFrame";
import { useViewerState } from "./useViewerState";
import { BROWSERS } from "../data/browsers";
import { DEVICES } from "../data/devices";
import { getBgUrl } from "../data/backgrounds";
import type { ExtMessage, FrameVariant } from "../types";
import "../styles/global.css";

function getInitialUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("url") ?? "https://example.com";
}

function Viewer() {
  const initialUrl = useRef(getInitialUrl()).current;
  const {
    state,
    loaded,
    width,
    height,
    setUrl,
    setDevice,
    setBrowserMode,
    setCustomDimensions,
    setZoom,
    toggleFrame,
    toggleTheme,
    setBackground,
  } = useViewerState(initialUrl);

  const [refreshCount, setRefreshCount] = useState(0);

  // Listen for NAVIGATE messages from the background
  useEffect(() => {
    const handler = (message: ExtMessage) => {
      if (message.type === "NAVIGATE") {
        setUrl(message.url);
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [setUrl]);

  // On initial load, sync browser mode UA rule with the background
  useEffect(() => {
    if (!loaded) return;
    const ua = BROWSERS[state.browserMode as keyof typeof BROWSERS]?.ua ?? "";
    chrome.runtime.sendMessage({
      type: "SET_BROWSER_MODE",
      mode: state.browserMode,
      ua,
    } as ExtMessage);
  }, [loaded]); // intentionally only when loaded

  const currentDevice = DEVICES.find((d) => d.id === state.deviceId);

  // Reload the iframe whenever the device crosses the mobile/desktop boundary,
  // because servers often return different HTML based on the UA category.
  const isTouchDevice =
    currentDevice?.category === "mobile" ||
    currentDevice?.category === "tablet";
  const prevIsTouchDevice = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (prevIsTouchDevice.current === undefined) {
      // Skip the very first render — no reload needed on initial mount.
      prevIsTouchDevice.current = isTouchDevice;
      return;
    }
    if (isTouchDevice !== prevIsTouchDevice.current) {
      prevIsTouchDevice.current = isTouchDevice;
      // Update the UA rule first; reload only once the background confirms
      // (sendResponse) that the DNR rule is set, so the very first request
      // the reloaded iframe makes carries the correct User-Agent.
      const ua = BROWSERS[state.browserMode as keyof typeof BROWSERS]?.ua ?? "";
      chrome.runtime.sendMessage(
        { type: "SET_BROWSER_MODE", mode: state.browserMode, ua } as ExtMessage,
        () => {
          if (!chrome.runtime.lastError) {
            setRefreshCount((c) => c + 1);
          }
        },
      );
    }
  // state.browserMode is read inside the effect — listed in deps so the
  // closure always sees the latest value; the isTouchDevice guard prevents
  // spurious reloads when only the browser mode changes within a category.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTouchDevice, state.browserMode]);

  const currentDeviceName =
    currentDevice?.name ??
    (state.deviceId === "custom" ? "Custom" : state.deviceId);
  const frameStyle: FrameVariant = (currentDevice?.frame ??
    "none") as FrameVariant;
  const activeFrame = state.showFrame && frameStyle !== "none";

  // When a frame is active, the top bar (status/chrome bar) takes up logical
  // pixels inside the screen area. Reduce the viewport height accordingly so
  // the iframe fills the content area exactly and nothing is clipped.
  const barH = activeFrame ? (FRAME_UI_BAR_H[frameStyle] ?? 0) : 0;
  const contentHeight = height - barH;

  if (!loaded) {
    return (
      <div
        className="flex items-center justify-center w-screen h-screen text-gray-600"
        style={{ background: "var(--app-bg)" }}
      >
        <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="31.4"
            strokeDashoffset="10"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className="flex flex-row w-screen h-screen overflow-hidden"
      data-theme={state.theme}
      style={{ background: "var(--app-bg)" }}
    >
      <Toolbar
        url={state.url}
        width={width}
        height={height}
        deviceId={state.deviceId}
        browserMode={state.browserMode}
        zoom={state.zoom}
        showFrame={state.showFrame}
        theme={state.theme}
        background={state.background}
        onUrlChange={setUrl}
        onDeviceChange={setDevice}
        onBrowserModeChange={setBrowserMode}
        onDimensionChange={setCustomDimensions}
        onZoomChange={setZoom}
        onToggleFrame={toggleFrame}
        onThemeToggle={toggleTheme}
        onBackgroundChange={setBackground}
        onRefresh={() => setRefreshCount((c) => c + 1)}
      />

      {/* Viewport scroll area */}
      <div
        className="flex-1"
        style={{
          overflow: "auto",
          background: getBgUrl(state.background)
            ? `url(${getBgUrl(state.background)}) center/cover no-repeat`
            : "var(--app-gradient)",
        }}
      >
        <div className="min-w-full min-h-full flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            {/* Device info label */}
            {!activeFrame && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-mono">
                  {width} × {height}px
                </span>
                <span>•</span>
                <span>{currentDeviceName}</span>
                {state.zoom !== 1 && (
                  <span className="text-blue-400 font-mono">
                    {Math.round(state.zoom * 100)}%
                  </span>
                )}
              </div>
            )}

            {/* Device frame + viewport */}
            <DeviceFrame
              frameStyle={activeFrame ? frameStyle : "none"}
              frameColor={currentDevice?.frameColor ?? "space-black"}
              zoom={state.zoom}
              deviceWidth={width}
              deviceHeight={height}
              url={state.url}
            >
              <ViewportFrame
                url={state.url}
                width={width}
                height={contentHeight}
                browserMode={state.browserMode}
                zoom={state.zoom}
                onResize={setCustomDimensions}
                hideHandles={activeFrame}
                refreshTrigger={refreshCount}
                isTouchDevice={isTouchDevice}
              />
            </DeviceFrame>

            {/* Device name + zoom below frame when frame is active */}
            {activeFrame && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span>{currentDeviceName}</span>
                <span>•</span>
                <span className="font-mono">
                  {width} × {height}px
                </span>
                {state.zoom !== 1 && (
                  <>
                    <span>•</span>
                    <span className="text-blue-400 font-mono">
                      {Math.round(state.zoom * 100)}%
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Viewer />);

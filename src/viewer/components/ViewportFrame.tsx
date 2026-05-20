/**
 * ViewportFrame
 *
 * Renders the iframe with resize handles on the right and bottom edges.
 * Also handles CSS sim injection via chrome.scripting.insertCSS when
 * the browser mode changes.
 */
import React, { useRef, useCallback, useEffect, useState } from "react";
import type { BrowserMode } from "../../types";
import { BROWSERS } from "../../data/browsers";

interface Props {
  url: string;
  width: number;
  height: number;
  browserMode: BrowserMode;
  zoom: number;
  onResize: (width: number, height: number) => void;
  hideHandles?: boolean;
  refreshTrigger?: number;
  /** When true, replaces the mouse cursor with a touch indicator and
   *  relays mouse events into the iframe as synthetic TouchEvents. */
  isTouchDevice?: boolean;
}

// We load the CSS sim file content at build time via ?raw imports
import safariCSS from "../../data/sim/safari.css?raw";
import firefoxCSS from "../../data/sim/firefox.css?raw";

const SIM_CSS: Partial<Record<BrowserMode, string>> = {
  "safari-ios": safariCSS,
  "safari-macos": safariCSS,
  "firefox-android": firefoxCSS,
  "firefox-desktop": firefoxCSS,
};

const HANDLE_SIZE = 8;

export function ViewportFrame({
  url,
  width,
  height,
  browserMode,
  zoom,
  onResize,
  hideHandles = false,
  refreshTrigger = 0,
  isTouchDevice = false,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<null | "right" | "bottom" | "corner">(null);
  const dragStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const [iframeKey, setIframeKey] = useState(0);
  const touchActive = useRef(false);
  const lastTouchLogical = useRef({ x: 0, y: 0 });
  const touchStartLogical = useRef({ x: 0, y: 0 });

  /** Convert a MouseEvent on the overlay to logical (unscaled) iframe coords */
  const overlayCoords = (e: React.MouseEvent | MouseEvent) => {
    const rect = overlayRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  };

  /** Send a touch command to the iframe via postMessage */
  const postTouch = (kind: "start" | "move" | "end", x: number, y: number) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "__RVP_TOUCH__", kind, x, y },
      "*",
    );
  };

  /** Send a scroll delta to the iframe (used for wheel events).
   *  x/y are the logical iframe coords of the pointer, so the content script
   *  can dispatch a WheelEvent at the right element (e.g. a Swiper container). */
  const postScroll = (deltaX: number, deltaY: number, x?: number, y?: number) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "__RVP_SCROLL__", deltaX, deltaY, x, y },
      "*",
    );
  };

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    touchActive.current = true;
    const { x, y } = overlayCoords(e);
    lastTouchLogical.current = { x, y };
    touchStartLogical.current = { x, y };
    postTouch("start", x, y);
  };

  const handleOverlayMouseMove = (e: React.MouseEvent) => {
    if (touchActive.current) {
      const { x, y } = overlayCoords(e);
      // Forward as TouchEvent only — the content script checks defaultPrevented
      // on the dispatched touchmove and falls back to window.scrollBy() if no
      // handler consumes it. Sending a separate postScroll here would cause
      // scroll-triggered sliders (e.g. Swiper) to receive conflicting signals.
      postTouch("move", x, y);
      lastTouchLogical.current = { x, y };
    }
  };

  const handleOverlayMouseUp = (e: React.MouseEvent) => {
    if (!touchActive.current) return;
    touchActive.current = false;
    const { x, y } = overlayCoords(e);
    postTouch("end", x, y);
    // For taps (small movement), focus the iframe so keyboard events route to
    // the input element that the relay will focus inside.
    const dx = x - touchStartLogical.current.x;
    const dy = y - touchStartLogical.current.y;
    if (Math.sqrt(dx * dx + dy * dy) < 10) {
      iframeRef.current?.focus();
    }
  };

  const handleOverlayMouseLeave = () => {
    if (touchActive.current) {
      touchActive.current = false;
      const { x, y } = lastTouchLogical.current;
      postTouch("end", x, y);
      const dx = x - touchStartLogical.current.x;
      const dy = y - touchStartLogical.current.y;
      if (Math.sqrt(dx * dx + dy * dy) < 10) {
        iframeRef.current?.focus();
      }
    }
  };

  // Keep a ref to zoom so the non-passive wheel handler never captures a stale value
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Register a non-passive wheel listener so preventDefault() actually works.
  // React 17+ attaches onWheel as passive, which prevents preventDefault.
  useEffect(() => {
    if (!isTouchDevice) return;
    const el = overlayRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      // Include pointer position so the content script can dispatch the
      // WheelEvent on the correct element (e.g. a Swiper container).
      const rect = overlayRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoomRef.current;
      const y = (e.clientY - rect.top) / zoomRef.current;
      postScroll(e.deltaX / zoomRef.current, e.deltaY / zoomRef.current, x, y);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [isTouchDevice]);

  // Reload iframe when refreshTrigger increments
  const prevRefresh = useRef(refreshTrigger);
  useEffect(() => {
    if (refreshTrigger !== prevRefresh.current) {
      prevRefresh.current = refreshTrigger;
      setIframeKey((k) => k + 1);
    }
  }, [refreshTrigger]);

  // Reload iframe when URL changes
  const prevUrl = useRef(url);
  useEffect(() => {
    if (url !== prevUrl.current) {
      prevUrl.current = url;
      // Changing the iframe src directly is smoother than re-keying
      if (iframeRef.current) {
        iframeRef.current.src = url;
      }
    }
  }, [url]);

  // Inject simulation CSS when browser mode or URL changes
  useEffect(() => {
    const css = SIM_CSS[browserMode];

    const iframe = iframeRef.current;
    if (!iframe) return;

    // We inject via the content of the iframe using scripting API.
    // Since scripting.insertCSS requires a tabId, we get it from the
    // background-managed tab via a message.
    // Fallback: try to inject directly into the iframe document if same-origin.
    const tryInjectDirect = () => {
      try {
        const iframeDoc = iframe.contentDocument;
        if (!iframeDoc) return;

        // Remove any previous sim style
        const prev = iframeDoc.getElementById("__rvp_sim_css__");
        if (prev) prev.remove();

        // Stamp data-rvp-mode on <html> so CSS can scope mode-specific rules
        if (css) {
          iframeDoc.documentElement.setAttribute("data-rvp-mode", browserMode);
        } else {
          iframeDoc.documentElement.removeAttribute("data-rvp-mode");
        }

        if (!css) return;

        const style = iframeDoc.createElement("style");
        style.id = "__rvp_sim_css__";
        style.textContent = css;
        iframeDoc.head?.appendChild(style) ??
          iframeDoc.documentElement.appendChild(style);
      } catch (_e) {
        // Cross-origin iframe — use scripting.insertCSS via background
        injectViaScripting(css);
      }
    };

    const injectViaScripting = (cssText: string | undefined) => {
      if (!cssText) return;
      // Post to background which will call scripting.insertCSS for cross-origin iframes,
      // and also stamp data-rvp-mode via scripting.executeScript
      chrome.runtime.sendMessage({
        type: "INJECT_SIM_CSS" as const,
        browserMode,
        css: cssText,
      });
    };

    // Wait for iframe to load before injecting
    const handleLoad = () => tryInjectDirect();
    iframe.addEventListener("load", handleLoad, { once: true });

    // If already loaded (same-origin reload), inject immediately
    try {
      if (iframe.contentDocument?.readyState === "complete") {
        tryInjectDirect();
      }
    } catch (_e) {
      // cross-origin; wait for load event
    }

    return () => iframe.removeEventListener("load", handleLoad);
  }, [browserMode, url]);

  // ── Resize drag logic ───────────────────────────────────────────────────────

  const startDrag = useCallback(
    (e: React.MouseEvent, dir: "right" | "bottom" | "corner") => {
      e.preventDefault();
      isDragging.current = dir;
      dragStart.current = { x: e.clientX, y: e.clientY, w: width, h: height };

      const onMouseMove = (ev: MouseEvent) => {
        // Drag deltas must be inverse-scaled since the visual handle moves
        // at zoom speed but we want to update the real (unscaled) dimensions.
        const dx = (ev.clientX - dragStart.current.x) / zoom;
        const dy = (ev.clientY - dragStart.current.y) / zoom;
        const dir = isDragging.current;
        if (!dir) return;

        let newW = dragStart.current.w;
        let newH = dragStart.current.h;

        if (dir === "right" || dir === "corner")
          newW = Math.max(200, dragStart.current.w + dx);
        if (dir === "bottom" || dir === "corner")
          newH = Math.max(200, dragStart.current.h + dy);

        onResize(Math.round(newW), Math.round(newH));
      };

      const onMouseUp = () => {
        isDragging.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [width, height, onResize],
  );

  // Visual (scaled) dimensions used for the outer wrapper
  const vw = Math.round(width * zoom);
  const vh = Math.round(height * zoom);

  return (
    <div
      ref={containerRef}
      className="relative flex-shrink-0"
      style={{
        width: hideHandles ? vw : vw + HANDLE_SIZE,
        height: hideHandles ? vh : vh + HANDLE_SIZE,
      }}
    >
      {/* Scaled iframe — real dimensions preserved so site sees correct viewport */}
      <div
        style={{
          width: vw,
          height: vh,
          overflow: "hidden",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <iframe
          ref={iframeRef}
          key={iframeKey}
          src={url}
          title="Forma"
          className="block border-0 absolute top-0 left-0"
          style={{
            width,
            height,
            // CSS zoom keeps the iframe's compositing layer rasterized at full
            // device resolution (width × height) and scales during compositing,
            // unlike transform: scale() which reduces the backing store resolution.
            zoom: zoom !== 1 ? zoom : undefined,
            pointerEvents: isTouchDevice || isDragging.current ? "none" : "auto",
          }}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals"
          // Storage Access API: lets the embedded site access its unpartitioned
          // first-party cookie store even though the top-level frame is
          // chrome-extension://.  Without this, SameSite=Lax cookies are never
          // sent in requests and cookie-consent banners reappear on every page.
          allow="storage-access"
          referrerPolicy="no-referrer"
        />

        {/* Touch overlay — intercepts mouse events, relays as TouchEvents into the iframe */}
        {isTouchDevice && (
          <div
            ref={overlayRef}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
            }}
            onMouseDown={handleOverlayMouseDown}
            onMouseMove={handleOverlayMouseMove}
            onMouseUp={handleOverlayMouseUp}
            onMouseLeave={handleOverlayMouseLeave}
          />
        )}
      </div>

      {/* Right resize handle */}
      {!hideHandles && (
        <div
          className="absolute top-0 right-0 cursor-ew-resize bg-transparent hover:bg-blue-500/30 transition-colors"
          style={{ width: HANDLE_SIZE, height: vh, top: 0, right: 0 }}
          onMouseDown={(e) => startDrag(e, "right")}
          title="Drag to resize width"
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-gray-700 hover:bg-blue-400 rounded-full my-8 transition-colors" />
        </div>
      )}

      {/* Bottom resize handle */}
      {!hideHandles && (
        <div
          className="absolute bottom-0 left-0 cursor-ns-resize bg-transparent hover:bg-blue-500/30 transition-colors"
          style={{ width: vw, height: HANDLE_SIZE, bottom: 0, left: 0 }}
          onMouseDown={(e) => startDrag(e, "bottom")}
          title="Drag to resize height"
        >
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-700 hover:bg-blue-400 rounded-full mx-8 transition-colors" />
        </div>
      )}

      {/* Corner resize handle */}
      {!hideHandles && (
        <div
          className="absolute bottom-0 right-0 cursor-nwse-resize w-4 h-4 flex items-end justify-end pb-0.5 pr-0.5"
          onMouseDown={(e) => startDrag(e, "corner")}
          title="Drag to resize"
        >
          <svg
            viewBox="0 0 8 8"
            className="w-3 h-3 text-gray-600 hover:text-blue-400 transition-colors"
          >
            <line
              x1="0"
              y1="8"
              x2="8"
              y2="0"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <line
              x1="4"
              y1="8"
              x2="8"
              y2="4"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

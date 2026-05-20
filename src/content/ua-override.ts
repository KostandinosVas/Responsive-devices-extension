/**
 * UA Override Content Script — world: "MAIN"
 *
 * Runs at document_start in the MAIN JS world (same context as page scripts)
 * so it can override navigator.userAgent before any page code reads it.
 *
 * The extension stores the active simulation UA in chrome.storage.session.
 * We read it synchronously-ish via a pre-injected global set by the background
 * (see __RVP_UA__ below), with a storage fallback.
 *
 * This script runs on ALL tabs, but the UA override is a no-op unless
 * __RVP_UA__ is set (only set for the viewer tab via scripting.executeScript).
 */

(function () {
  // The background worker injects __RVP_UA__ into the viewer tab via
  // scripting.executeScript before the page navigates. On other tabs this
  // will be undefined so we exit immediately.
  const ua: string | undefined = (window as unknown as Record<string, unknown>)[
    "__RVP_UA__"
  ] as string | undefined;

  if (!ua || ua.trim() === "" || ua === navigator.userAgent) return;

  try {
    // Override navigator.userAgent
    Object.defineProperty(navigator, "userAgent", {
      get: () => ua,
      configurable: true,
    });

    // Override navigator.appVersion (legacy, but some UA sniffers use it)
    const appVersion = ua.startsWith("Mozilla/")
      ? ua.slice("Mozilla/".length)
      : ua;
    Object.defineProperty(navigator, "appVersion", {
      get: () => appVersion,
      configurable: true,
    });

    // Stub navigator.userAgentData — Safari and Firefox don't expose it;
    // returning null/undefined is correct for those simulations.
    // Only Chrome browsers expose userAgentData, so stub it out.
    if ("userAgentData" in navigator) {
      Object.defineProperty(navigator, "userAgentData", {
        get: () => undefined,
        configurable: true,
      });
    }

    // Override navigator.vendor for Safari simulation
    if (ua.includes("Safari") && !ua.includes("Chrome")) {
      Object.defineProperty(navigator, "vendor", {
        get: () => "Apple Computer, Inc.",
        configurable: true,
      });
    } else if (ua.includes("Firefox")) {
      Object.defineProperty(navigator, "vendor", {
        get: () => "",
        configurable: true,
      });
    }

    // Set navigator.platform for mobile simulations
    if (ua.includes("iPhone") || ua.includes("iPad")) {
      Object.defineProperty(navigator, "platform", {
        get: () => "iPhone",
        configurable: true,
      });
      // Stub maxTouchPoints to signal touch device
      Object.defineProperty(navigator, "maxTouchPoints", {
        get: () => 5,
        configurable: true,
      });
    } else if (ua.includes("Android")) {
      Object.defineProperty(navigator, "platform", {
        get: () => "Linux armv8l",
        configurable: true,
      });
      Object.defineProperty(navigator, "maxTouchPoints", {
        get: () => 5,
        configurable: true,
      });
    }

    // ── Touch capability signal ──────────────────────────────────────────────
    // Many sites check `'ontouchstart' in window` to branch into touch-optimised
    // code paths. Defining it (even as null) makes the check return true.
    const isTouchUA =
      ua.includes("iPhone") || ua.includes("iPad") || ua.includes("Android");
    if (isTouchUA && !("ontouchstart" in window)) {
      try {
        Object.defineProperty(window, "ontouchstart", {
          get: () => null,
          configurable: true,
        });
      } catch (_e) {
        /* sealed — skip */
      }
    }

    // ── Hide scrollbar on mobile/tablet UAs ─────────────────────────────────
    // Real mobile browsers don't show a persistent scrollbar; hide it so the
    // simulation matches. Injected as early as possible (document_start) so
    // it applies before the page renders.
    if (isTouchUA) {
      const injectScrollbarHide = () => {
        const style = document.createElement("style");
        style.id = "__rvp_no_scrollbar__";
        style.textContent = `
          *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
          * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
        `;
        (document.head ?? document.documentElement).appendChild(style);
      };
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectScrollbarHide, { once: true });
      } else {
        injectScrollbarHide();
      }
    }

    // ── matchMedia interception ──────────────────────────────────────────────
    // Browsers report real hardware capabilities regardless of UA. We intercept
    // `window.matchMedia` and return correct values for pointer/hover/color
    // media features so responsive sites switch to their intended layout.
    const isMobileUA = ua.includes("iPhone") || ua.includes("Android");
    const isAppleUA = ua.includes("Safari") && !ua.includes("Chrome");
    const isWideGamut = isAppleUA; // Apple devices are P3 wide-gamut

    const _realMatchMedia = window.matchMedia.bind(window);
    try {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: (query: string): MediaQueryList => {
          const q = query.trim().toLowerCase();

          // pointer: coarse  — touch screens have imprecise pointers
          if (q === "(pointer: coarse)" || q === "pointer: coarse") {
            return _fakeMedia(q, isMobileUA);
          }
          if (q === "(pointer: fine)" || q === "pointer: fine") {
            return _fakeMedia(q, !isMobileUA);
          }
          // hover: none  — most touch devices can't hover
          if (q === "(hover: none)" || q === "hover: none") {
            return _fakeMedia(q, isMobileUA);
          }
          if (q === "(hover: hover)" || q === "hover: hover") {
            return _fakeMedia(q, !isMobileUA);
          }
          // any-pointer / any-hover — same intent
          if (q === "(any-pointer: coarse)" || q === "any-pointer: coarse") {
            return _fakeMedia(q, isMobileUA);
          }
          if (q === "(any-hover: none)" || q === "any-hover: none") {
            return _fakeMedia(q, isMobileUA);
          }
          // Wide-gamut — Apple devices support P3
          if (q.includes("color-gamut") && q.includes("p3")) {
            return _fakeMedia(q, isWideGamut);
          }
          if (q.includes("color-gamut") && q.includes("srgb")) {
            return _fakeMedia(q, true); // all screens support sRGB
          }

          // Everything else: delegate to the real implementation
          return _realMatchMedia(query);
        },
      });
    } catch (_e) {
      /* can't override — fall back to real */
    }

    // ── Device orientation / motion stubs ────────────────────────────────────
    // Sites gate gyroscope features on the existence of these event types.
    // Chrome exposes them on real devices but not in a plain desktop tab.
    // Define lightweight stubs so feature-detection passes without leaking
    // any real sensor data.
    if (isTouchUA) {
      if (typeof window.DeviceOrientationEvent === "undefined") {
        try {
          (window as Record<string, unknown>).DeviceOrientationEvent =
            class DeviceOrientationEvent extends Event {
              readonly alpha: number | null = null;
              readonly beta: number | null = null;
              readonly gamma: number | null = null;
              readonly absolute: boolean = false;
              constructor(type: string, init?: EventInit) {
                super(type, init);
              }
            };
        } catch (_e) {
          /* skip */
        }
      }
      if (typeof window.DeviceMotionEvent === "undefined") {
        try {
          (window as Record<string, unknown>).DeviceMotionEvent =
            class DeviceMotionEvent extends Event {
              readonly acceleration: null = null;
              readonly accelerationIncludingGravity: null = null;
              readonly rotationRate: null = null;
              readonly interval: number = 0;
              constructor(type: string, init?: EventInit) {
                super(type, init);
              }
            };
        } catch (_e) {
          /* skip */
        }
      }
    }
  } catch (_e) {
    // If the page freezes navigator properties (strict mode / sealed object),
    // we silently fail. The network-level UA override via DNR still works.
  }
})();

// ── Touch-event relay ─────────────────────────────────────────────────────────
// The viewer page sends mouse events as postMessages so the simulated page
// receives proper TouchEvents instead of mouse events.
(function () {
  if ((window as Record<string, unknown>).__rvp_touch_relay__) return;
  (window as Record<string, unknown>).__rvp_touch_relay__ = true;

  let activeTouchId = 0;
  let lastTarget: EventTarget | null = null;
  let touchStartX = 0;
  let touchStartY = 0;
  // Track last move position so we can compute swipe-scroll deltas below.
  let lastMoveX = 0;
  let lastMoveY = 0;

  function makeTouch(target: EventTarget, x: number, y: number): Touch {
    return new Touch({
      identifier: activeTouchId,
      target: target as Element,
      clientX: x,
      clientY: y,
      pageX: x + window.scrollX,
      pageY: y + window.scrollY,
      screenX: x,
      screenY: y,
      radiusX: 12,
      radiusY: 12,
      rotationAngle: 0,
      force: 1,
    });
  }

  function dispatch(
    target: EventTarget,
    type: "touchstart" | "touchmove" | "touchend",
    t: Touch,
  ): TouchEvent {
    const active = type === "touchend" ? [] : [t];
    const ev = new TouchEvent(type, {
      bubbles: true,
      cancelable: true,
      touches: active as unknown as TouchList,
      targetTouches: active as unknown as TouchList,
      changedTouches: [t] as unknown as TouchList,
    });
    target.dispatchEvent(ev);
    return ev;
  }

  window.addEventListener("message", (e) => {
    const d = e.data as { type?: string; kind?: string; x?: number; y?: number } | null;
    if (!d || d.type !== "__RVP_TOUCH__") return;
    const x = d.x ?? 0;
    const y = d.y ?? 0;
    const el = document.elementFromPoint(x, y) ?? document.body;

    if (d.kind === "start") {
      activeTouchId++;
      lastTarget = el;
      touchStartX = x;
      touchStartY = y;
      lastMoveX = x;
      lastMoveY = y;
      dispatch(el, "touchstart", makeTouch(el, x, y));
    } else if (d.kind === "move" && lastTarget) {
      const ev = dispatch(lastTarget, "touchmove", makeTouch(lastTarget, x, y));
      // If no handler called preventDefault() (i.e. no slider consumed the
      // touch), manually scroll the page so swipe-to-scroll still works on
      // regular pages that rely on native browser scroll.
      if (!ev.defaultPrevented) {
        window.scrollBy({
          left: -(x - lastMoveX),
          top: -(y - lastMoveY),
          // @ts-ignore — "instant" is valid but missing from older TS lib types
          behavior: "instant",
        });
      }
      lastMoveX = x;
      lastMoveY = y;
    } else if (d.kind === "end" && lastTarget) {
      dispatch(lastTarget, "touchend", makeTouch(lastTarget, x, y));
      // Synthesize a click if the finger didn't move (tap gesture).
      // Real browsers do this automatically from native touch; synthetic
      // TouchEvents via dispatchEvent() do not trigger it automatically.
      const dx = x - touchStartX;
      const dy = y - touchStartY;
      if (Math.sqrt(dx * dx + dy * dy) < 10) {
        if (
          typeof document.requestStorageAccess === "function" &&
          !(document as { __rvpSAReq?: boolean }).__rvpSAReq
        ) {
          (document as { __rvpSAReq?: boolean }).__rvpSAReq = true;
          document.requestStorageAccess().catch(() => {});
        }
        const clickTarget = document.elementFromPoint(x, y) ?? document.body;
        clickTarget.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            screenX: x,
            screenY: y,
            view: window,
          }),
        );
        // Synthetic clicks don't trigger native focus — explicitly focus
        // any tapped input/textarea/select/contenteditable.
        const focusable = (
          clickTarget.matches("input,textarea,select,[contenteditable]")
            ? clickTarget
            : clickTarget.closest("input,textarea,select,[contenteditable]")
        ) as HTMLElement | null;
        if (focusable) focusable.focus();
      }
      lastTarget = null;
    }
  });

  // Scroll relay — wheel events forwarded from the viewer.
  // We dispatch a real WheelEvent at the element under the pointer so that
  // wheel-based sliders (e.g. Swiper mousewheel module) can intercept it.
  // Only fall back to window.scrollBy() if no handler called preventDefault().
  window.addEventListener("message", (e) => {
    const d = e.data as { type?: string; deltaX?: number; deltaY?: number; x?: number; y?: number } | null;
    if (!d || d.type !== "__RVP_SCROLL__") return;
    const deltaX = d.deltaX ?? 0;
    const deltaY = d.deltaY ?? 0;

    if (d.x !== undefined && d.y !== undefined) {
      const el = document.elementFromPoint(d.x, d.y) ?? document.body;
      const wheelEv = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaX,
        deltaY,
        deltaMode: WheelEvent.DOM_DELTA_PIXEL,
        clientX: d.x,
        clientY: d.y,
        view: window,
      });
      el.dispatchEvent(wheelEv);
      // A slider (e.g. Swiper) calls preventDefault() to own this scroll.
      // Respect that and don't also move the page.
      if (wheelEv.defaultPrevented) return;
    }

    window.scrollBy({
      left: deltaX,
      top: deltaY,
      // @ts-ignore — "instant" is valid but missing from older TS lib types
      behavior: "instant",
    });
  });
})();

// ── Helper: synthesise a MediaQueryList with a fixed matches value ──────────
function _fakeMedia(query: string, matches: boolean): MediaQueryList {
  return Object.assign(new EventTarget(), {
    matches,
    media: query,
    onchange: null,
    addListener() {
      /* deprecated no-op */
    },
    removeListener() {
      /* deprecated no-op */
    },
    addEventListener() {
      /* events never fire on a static stub */
    },
    removeEventListener() {
      /* no-op */
    },
    dispatchEvent: (e: Event) => e.cancelable,
  }) as unknown as MediaQueryList;
}

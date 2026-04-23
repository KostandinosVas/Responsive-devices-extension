/**
 * Background Service Worker
 *
 * Responsibilities:
 * 1. Open / focus the viewer window on demand
 * 2. Manage SESSION DNR rules (remove X-Frame-Options + CSP headers) scoped
 *    only to the viewer tab. tabIds is only supported in session rules (not
 *    dynamic rules) — session rules are auto-cleared on browser restart.
 * 3. Manage session DNR rules for User-Agent spoofing per viewer tab
 * 4. Relay messages between popup/viewer and content scripts
 */

import type { ExtMessage, BrowserMode } from "../types";

// ── Constants ────────────────────────────────────────────────────────────────

const VIEWER_PATH = "src/viewer/index.html";

// DNR rule IDs (stable, unique per type):
// We use a base + tabId approach capped to safe ranges
const DNR_FRAME_BYPASS_BASE = 1000; // rule: remove X-Frame-Options / CSP
const DNR_UA_BASE = 2000; // rule: set User-Agent request header

// Map: tabId → windowId (for viewer windows we manage)
const viewerTabs = new Map<number, number>();

// ── Helpers ──────────────────────────────────────────────────────────────────

function frameBypassRuleId(tabId: number): number {
  return DNR_FRAME_BYPASS_BASE + (tabId % 900);
}

function uaRuleId(tabId: number): number {
  return DNR_UA_BASE + (tabId % 900);
}

/**
 * Register SESSION DNR rules that strip X-Frame-Options and CSP frame-ancestors
 * headers for responses loaded inside the viewer tab.
 * NOTE: tabIds is only supported in session rules, not dynamic rules.
 */
async function addFrameBypassRules(tabId: number): Promise<void> {
  const ruleId = frameBypassRuleId(tabId);

  const rule: chrome.declarativeNetRequest.Rule = {
    id: ruleId,
    priority: 10,
    condition: {
      tabIds: [tabId],
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
        chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
      ],
    },
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      responseHeaders: [
        {
          header: "x-frame-options",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "content-security-policy",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "content-security-policy-report-only",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
      ],
    },
  };

  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [ruleId],
    addRules: [rule],
  });
}

/**
 * Set or clear the User-Agent spoof DNR rule for the viewer tab.
 * Passing null/empty ua removes the rule (reverts to real Chrome UA).
 */
async function setUARule(tabId: number, ua: string | null): Promise<void> {
  const ruleId = uaRuleId(tabId);

  if (!ua) {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [ruleId],
    });
    return;
  }

  const rule: chrome.declarativeNetRequest.Rule = {
    id: ruleId,
    priority: 10,
    condition: {
      tabIds: [tabId],
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
        chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
        chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
        chrome.declarativeNetRequest.ResourceType.SCRIPT,
        chrome.declarativeNetRequest.ResourceType.IMAGE,
        chrome.declarativeNetRequest.ResourceType.STYLESHEET,
        chrome.declarativeNetRequest.ResourceType.FONT,
        chrome.declarativeNetRequest.ResourceType.OTHER,
      ],
    },
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      requestHeaders: [
        {
          header: "user-agent",
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          value: ua,
        },
      ],
    },
  };

  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [ruleId],
    addRules: [rule],
  });
}

/**
 * Remove all DNR rules for a given viewer tab (called on tab close).
 */
async function removeRulesForTab(tabId: number): Promise<void> {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [frameBypassRuleId(tabId), uaRuleId(tabId)],
  });
}

// ── Open / Focus viewer ───────────────────────────────────────────────────────

async function openViewer(url: string): Promise<void> {
  // Check if a viewer window is already open
  const existingEntries = [...viewerTabs.entries()];

  if (existingEntries.length > 0) {
    const [existingTabId, existingWindowId] = existingEntries[0];
    // Focus the existing window and navigate to the new URL
    await chrome.windows.update(existingWindowId, { focused: true });
    await chrome.tabs.sendMessage(existingTabId, {
      type: "NAVIGATE",
      url,
    } satisfies ExtMessage);
    return;
  }

  // Create a new viewer window at 80% × 70% of the primary display, centered
  const viewerUrl =
    chrome.runtime.getURL(VIEWER_PATH) + "?url=" + encodeURIComponent(url);

  let W = 1280;
  let H = 900;
  let left = 0;
  let top = 0;
  try {
    const displays = await chrome.system.display.getInfo();
    const primary = displays.find((d) => d.isPrimary) ?? displays[0];
    if (primary) {
      W = Math.round(primary.bounds.width * 0.8);
      H = Math.round(primary.bounds.height * 0.7);
      left = primary.bounds.left + Math.round((primary.bounds.width - W) / 2);
      top = primary.bounds.top + Math.round((primary.bounds.height - H) / 2);
    }
  } catch (_) {
    // fall back to fixed defaults
  }

  const win = await chrome.windows.create({
    url: viewerUrl,
    type: "popup",
    width: W,
    height: H,
    left,
    top,
    focused: true,
  });

  if (!win || !win.id || !win.tabs?.[0]?.id) return;

  const winId = win.id;
  const tabId = win.tabs[0].id!;

  viewerTabs.set(tabId, winId);

  // Activate frame bypass rules immediately
  await addFrameBypassRules(tabId);
}

// ── Listeners ────────────────────────────────────────────────────────────────

// 1. Messages from popup / viewer
chrome.runtime.onMessage.addListener(
  (message: ExtMessage, _sender, sendResponse) => {
    if (message.type === "OPEN_VIEWER") {
      openViewer(message.url)
        .then(() => sendResponse({ ok: true }))
        .catch(console.error);
      return true; // async response
    }

    if (message.type === "SET_BROWSER_MODE") {
      // Find the viewer tab (message comes from viewer page)
      const tabEntry = [...viewerTabs.entries()][0];
      if (!tabEntry) return;
      const [tabId] = tabEntry;

      const ua = message.mode === "chrome" ? null : message.ua;
      setUARule(tabId, ua)
        .then(() => {
          // Store in session storage so the UA override content script can read it
          return chrome.storage.session.set({
            simMode: message.mode,
            simUA: message.ua,
          });
        })
        .then(() => sendResponse({ ok: true }))
        .catch(console.error);
      return true;
    }

    return false;
  },
);

// 2. Tab close → clean up rules + map entry
chrome.tabs.onRemoved.addListener((tabId) => {
  if (viewerTabs.has(tabId)) {
    viewerTabs.delete(tabId);
    removeRulesForTab(tabId).catch(console.error);
  }
});

// 3. Dynamic UA + CSS injection on frame navigation within viewer tabs
chrome.webNavigation.onCommitted.addListener(
  async (details) => {
    if (!viewerTabs.has(details.tabId)) return;
    // Only inject into http/https sub-frames (the iframed target pages)
    if (details.frameId === 0) return; // skip the viewer page's own frame

    const result = await chrome.storage.session.get(["simUA", "simMode"]);
    const simUA = result["simUA"] as string | undefined;
    const simMode = result["simMode"] as string | undefined;

    // ── UA override JS injection ──────────────────────────────────────────
    if (simUA && simMode && simMode !== "chrome") {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: details.tabId, frameIds: [details.frameId] },
          world: chrome.scripting.ExecutionWorld.MAIN,
          injectImmediately: true,
          func: (ua: string) => {
            (window as Window & typeof globalThis & { __RVP_UA__: string })[
              "__RVP_UA__"
            ] = ua;
            try {
              Object.defineProperty(navigator, "userAgent", {
                get: () => ua,
                configurable: true,
              });
              const appVer = ua.startsWith("Mozilla/")
                ? ua.slice("Mozilla/".length)
                : ua;
              Object.defineProperty(navigator, "appVersion", {
                get: () => appVer,
                configurable: true,
              });
              if ("userAgentData" in navigator) {
                Object.defineProperty(navigator, "userAgentData", {
                  get: () => undefined,
                  configurable: true,
                });
              }
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
              if (ua.includes("iPhone") || ua.includes("iPad")) {
                Object.defineProperty(navigator, "platform", {
                  get: () => "iPhone",
                  configurable: true,
                });
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
            } catch (_e) {
              // navigator properties may be sealed on some pages
            }
          },
          args: [simUA],
        });
      } catch (_e) {
        // Frame may not be accessible
      }
    }
  },
  { url: [{ schemes: ["http", "https"] }] },
);

// 4. Handle CSS injection requests from ViewportFrame (cross-origin iframes)
chrome.runtime.onMessage.addListener(
  (
    message: { type: string; browserMode?: string; css?: string },
    _sender,
    sendResponse,
  ) => {
    if (message.type !== "INJECT_SIM_CSS") return false;

    const tabEntry = [...viewerTabs.entries()][0];
    if (!tabEntry || !message.css) {
      sendResponse({ ok: false });
      return false;
    }

    const [tabId] = tabEntry;

    chrome.webNavigation.getAllFrames({ tabId }, (frames) => {
      if (!frames) {
        sendResponse({ ok: false });
        return;
      }

      // Inject into all sub-frames (the iframed content, not the viewer shell)
      const frameIds = frames
        .filter((f) => f.frameId !== 0)
        .map((f) => f.frameId);

      if (frameIds.length === 0) {
        sendResponse({ ok: true });
        return;
      }

      chrome.scripting
        .insertCSS({
          target: { tabId, frameIds },
          css: message.css!,
        })
        .then(() => {
          // Also stamp data-rvp-mode on <html> so mode-scoped CSS selectors work
          if (message.browserMode) {
            const mode = message.browserMode;
            chrome.scripting
              .executeScript({
                target: { tabId, frameIds },
                func: (m: string) => {
                  document.documentElement.setAttribute("data-rvp-mode", m);
                },
                args: [mode],
              })
              .catch(() => {
                /* non-fatal */
              });
          }
          sendResponse({ ok: true });
        })
        .catch(() => sendResponse({ ok: false }));
    });

    return true; // async
  },
);

// 5. Keyboard command
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-viewer") return;

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!activeTab?.url) return;

  // If viewer already open, just focus it
  const existingEntries = [...viewerTabs.entries()];
  if (existingEntries.length > 0) {
    const [, windowId] = existingEntries[0];
    await chrome.windows.update(windowId, { focused: true });
    return;
  }

  await openViewer(activeTab.url);
});

// 6. On install: clear any stale dynamic rules from previous sessions
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  if (existing.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existing.map((r) => r.id),
    });
  }
  // Session rules are cleared automatically on browser restart;
  // also clear any stale ones left from extension reload during dev
  const sessionRules = await chrome.declarativeNetRequest.getSessionRules();
  if (sessionRules.length > 0) {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: sessionRules.map((r) => r.id),
    });
  }
});

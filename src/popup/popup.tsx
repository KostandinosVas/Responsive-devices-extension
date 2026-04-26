import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ExtMessage } from "../types";
import "../styles/global.css";

function Popup() {
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url ?? "";
      // Don't try to open chrome:// or extension pages in the viewer
      if (url.startsWith("http://") || url.startsWith("https://")) {
        setCurrentUrl(url);
      } else {
        setCurrentUrl("");
      }
    });
  }, []);

  const openViewer = async () => {
    if (!currentUrl) return;
    setLoading(true);
    setError(null);
    try {
      // Request host permission if not already granted.
      // This must happen from a user gesture in the popup (Chrome requirement).
      const alreadyGranted = await chrome.permissions.contains({
        origins: ["<all_urls>"],
      });
      if (!alreadyGranted) {
        const granted = await chrome.permissions.request({
          origins: ["<all_urls>"],
        });
        if (!granted) {
          setError("Host permission required to preview pages.");
          setLoading(false);
          return;
        }
      }
      await chrome.runtime.sendMessage({
        type: "OPEN_VIEWER",
        url: currentUrl,
      } satisfies ExtMessage);
      window.close();
    } catch (e) {
      setError("Failed to open viewer. Please try again.");
      setLoading(false);
    }
  };

  const isValidUrl =
    currentUrl.startsWith("http://") || currentUrl.startsWith("https://");

  return (
    <div className="popup-root">
      {/* ── Header ──────────────────────────────────── */}
      <div className="popup-header">
        <div className="popup-logo-mark">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            style={{ width: 18, height: 18 }}
          >
            <rect
              x="2"
              y="4"
              width="20"
              height="13"
              rx="2"
              stroke="url(#popup-lg)"
              strokeWidth="1.8"
            />
            <path
              d="M8 21h8M12 17v4"
              stroke="url(#popup-lg)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient
                id="popup-lg"
                x1="0"
                y1="0"
                x2="24"
                y2="24"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#818cf8" />
                <stop offset="1" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div className="popup-title">Forma</div>
          <div className="popup-tagline">Responsive Viewer Pro</div>
        </div>
      </div>

      {/* ── Feature pills ───────────────────────────── */}
      <div className="popup-pills">
        <span className="popup-pill">UA Spoofing</span>
        <span className="popup-pill">Frame Bypass</span>
        <span className="popup-pill">30+ Devices</span>
        <span className="popup-pill">5 Browsers</span>
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <div className="popup-content">
        {isValidUrl ? (
          <>
            <div>
              <div className="popup-url-label">Current Page</div>
              <div className="popup-url-display" title={currentUrl}>
                {currentUrl}
              </div>
            </div>

            <button
              onClick={openViewer}
              disabled={loading}
              className="popup-cta"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
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
                  Opening…
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ width: 16, height: 16 }}
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  Open in Forma
                </>
              )}
            </button>

            {error && (
              <div
                className="text-xs text-red-400 rounded px-2 py-1.5"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                {error}
              </div>
            )}
          </>
        ) : (
          <div className="popup-empty">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ width: 32, height: 32, color: "rgba(100,116,139,0.4)" }}
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
            </svg>
            <div className="text-sm" style={{ color: "rgba(148,163,184,0.7)" }}>
              Navigate to an <span style={{ color: "#a78bfa" }}>http://</span>{" "}
              or <span style={{ color: "#a78bfa" }}>https://</span> page first.
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────── */}
      <div className="popup-footer">
        <span className="popup-footer-text">Shortcut</span>
        <span className="popup-kbd">Ctrl+Shift+R</span>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);

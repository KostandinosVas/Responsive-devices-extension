/**
 * Toolbar (Sidebar)
 *
 * Left-side panel of the viewer window. Contains:
 * - Logo / branding header
 * - URL bar
 * - Device preset picker (in-flow collapsible)
 * - Viewport dimension inputs
 * - Browser simulation pill grid
 * - Zoom slider
 * - Frame toggle + Refresh footer
 */
import React, { useState, useRef, useEffect } from "react";
import type { BrowserMode } from "../../types";
import { BROWSERS, BROWSER_LIST } from "../../data/browsers";
import { DEVICES } from "../../data/devices";
import { BACKGROUNDS } from "../../data/backgrounds";
import logoUrl from "../../assets/forma_logo.svg";

interface Props {
  url: string;
  width: number;
  height: number;
  deviceId: string;
  browserMode: BrowserMode;
  zoom: number;
  showFrame: boolean;
  theme: "dark" | "light";
  background: string | null;
  onUrlChange: (url: string) => void;
  onDeviceChange: (deviceId: string) => void;
  onBrowserModeChange: (mode: BrowserMode) => void;
  onDimensionChange: (w: number, h: number) => void;
  onZoomChange: (zoom: number) => void;
  onToggleFrame: () => void;
  onThemeToggle: () => void;
  onBackgroundChange: (bg: string | null) => void;
  onRefresh: () => void;
}

const CATEGORIES = ["mobile", "tablet", "desktop", "custom"] as const;
const CATEGORY_LABELS: Record<string, string> = {
  mobile: "Mobile",
  tablet: "Tablet",
  desktop: "Desktop",
  custom: "Custom",
};

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;

// Compact display labels for browser pills
const BROWSER_PILL_LABEL: Record<string, string> = {
  chrome: "Chrome",
  "safari-ios": "Safari iOS",
  "safari-macos": "Safari",
  "firefox-android": "Firefox",
  "firefox-desktop": "Firefox",
};

// ── Icons ────────────────────────────────────────────────────

function CategoryIcon({ cat }: { cat: string }) {
  if (cat === "mobile")
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-3 h-3"
      >
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <circle cx="12" cy="18.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  if (cat === "tablet")
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-3 h-3"
      >
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <circle cx="12" cy="18.2" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  if (cat === "desktop")
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="w-3 h-3"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="w-3 h-3"
    >
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function BrowserIcon({ id }: { id: string }) {
  if (id === "chrome")
    return (
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3.5" />
        <path
          d="M12 8.5L19.5 8.5M8.5 14.5L5.5 9.3M15.5 14.5L19.5 8.5"
          strokeLinecap="round"
        />
      </svg>
    );
  if (id === "safari-ios" || id === "safari-macos")
    return (
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M16.5 7.5l-3 5.2-5.2 3 3-5.2z" strokeLinejoin="round" />
      </svg>
    );
  // Firefox variants
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3c4 2 5.5 6 4 10s-5 6-8 5" strokeLinecap="round" />
    </svg>
  );
}

// ── Limitations inline panel ─────────────────────────────────

function LimitationsBadge({ mode }: { mode: BrowserMode }) {
  const [open, setOpen] = useState(false);
  const profile = BROWSERS[mode];
  if (profile.limitations.length === 0 || mode === "chrome") return null;

  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="limitations-toggle">
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-3.5 h-3.5 flex-shrink-0"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        <span>Simulation limitations</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-3 h-3 ml-auto transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div className="limitations-panel">
          <ul className="space-y-1.5">
            {profile.limitations.map((l, i) => (
              <li
                key={i}
                className="flex gap-2 text-xs text-gray-300 leading-snug"
              >
                <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Main Toolbar export ──────────────────────────────────────

export function Toolbar({
  url,
  width,
  height,
  deviceId,
  browserMode,
  zoom,
  showFrame,
  theme,
  background,
  onUrlChange,
  onDeviceChange,
  onBrowserModeChange,
  onDimensionChange,
  onZoomChange,
  onToggleFrame,
  onThemeToggle,
  onBackgroundChange,
  onRefresh,
}: Props) {
  const [urlInput, setUrlInput] = useState(url);
  const [widthInput, setWidthInput] = useState(String(width));
  const [heightInput, setHeightInput] = useState(String(height));
  const [deviceOpen, setDeviceOpen] = useState(false);

  // Sync inputs when external state changes (e.g. drag resize)
  useEffect(() => {
    setWidthInput(String(width));
  }, [width]);
  useEffect(() => {
    setHeightInput(String(height));
  }, [height]);
  useEffect(() => {
    setUrlInput(url);
  }, [url]);

  const submitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    let normalized = urlInput.trim();
    if (
      normalized &&
      !normalized.startsWith("http://") &&
      !normalized.startsWith("https://")
    ) {
      normalized = "https://" + normalized;
    }
    if (normalized) onUrlChange(normalized);
  };

  const commitWidth = () => {
    const v = parseInt(widthInput, 10);
    if (!isNaN(v) && v >= 200 && v <= 5000) onDimensionChange(v, height);
    else setWidthInput(String(width));
  };

  const commitHeight = () => {
    const v = parseInt(heightInput, 10);
    if (!isNaN(v) && v >= 200 && v <= 5000) onDimensionChange(width, v);
    else setHeightInput(String(height));
  };

  const currentDevice = DEVICES.find((d) => d.id === deviceId);
  const hasDeviceFrame =
    !!currentDevice?.frame && currentDevice.frame !== "none";
  const currentDeviceName =
    deviceId === "custom"
      ? "Custom"
      : (DEVICES.find((d) => d.id === deviceId)?.name ?? "Device");

  const devicesByCategory = CATEGORIES.map((cat) => ({
    cat,
    devices: DEVICES.filter((d) => d.category === cat),
  }));

  const zoomPct = Math.round(zoom * 100);

  const stepZoom = (dir: 1 | -1) => {
    const next = Math.round((zoom + dir * ZOOM_STEP) * 10) / 10;
    onZoomChange(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next)));
  };

  return (
    <aside className="sidebar">
      {/* ── Logo ────────────────────────────────────────── */}
      <div className="sidebar-logo">
        <img
          src={logoUrl}
          alt="Forma — Responsive Design Viewer"
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </div>

      <div className="sidebar-scroll">
        {/* ── URL ─────────────────────────────────────── */}
        <div className="sidebar-section">
          <div className="section-label">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
            URL
          </div>
          <form onSubmit={submitUrl}>
            <div className="url-input-wrap">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="url-input"
                placeholder="https://example.com"
                spellCheck={false}
              />
              <button
                type="submit"
                className="url-submit"
                title="Navigate (Enter)"
              >
                ↵
              </button>
            </div>
          </form>
        </div>

        {/* ── Device ──────────────────────────────────── */}
        <div className="sidebar-section">
          <div className="section-label">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-3 h-3"
            >
              <rect x="7" y="2" width="10" height="20" rx="2" />
            </svg>
            Device
          </div>
          <button
            onClick={() => setDeviceOpen((v) => !v)}
            className={`device-header-btn ${deviceOpen ? "open" : ""}`}
          >
            <span className="device-current-name">{currentDeviceName}</span>
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`w-3.5 h-3.5 text-gray-500 flex-shrink-0 transition-transform ${deviceOpen ? "rotate-180" : ""}`}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {deviceOpen && (
            <div className="device-list">
              {devicesByCategory.map(({ cat, devices }) =>
                devices.length === 0 ? null : (
                  <div key={cat}>
                    <div className="dropdown-category">
                      <CategoryIcon cat={cat} />
                      {CATEGORY_LABELS[cat]}
                    </div>
                    {devices.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          onDeviceChange(d.id);
                          setDeviceOpen(false);
                        }}
                        className={`device-option ${d.id === deviceId ? "active" : ""}`}
                      >
                        <span>{d.name}</span>
                        <span className="device-option-dim">
                          {d.width}×{d.height}
                        </span>
                      </button>
                    ))}
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        {/* ── Viewport size ────────────────────────────── */}
        <div className="sidebar-section">
          <div className="section-label">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-3 h-3"
            >
              <path
                d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3"
                strokeLinecap="round"
              />
            </svg>
            Viewport
          </div>
          <div className="dim-row">
            <div className="dim-field">
              <input
                type="number"
                value={widthInput}
                onChange={(e) => setWidthInput(e.target.value)}
                onBlur={commitWidth}
                onKeyDown={(e) => e.key === "Enter" && commitWidth()}
                className="dim-input"
                min={200}
                max={5000}
                title="Width (px)"
              />
              <span className="dim-unit">W</span>
            </div>
            <span className="dim-sep">×</span>
            <div className="dim-field">
              <input
                type="number"
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                onBlur={commitHeight}
                onKeyDown={(e) => e.key === "Enter" && commitHeight()}
                className="dim-input"
                min={200}
                max={5000}
                title="Height (px)"
              />
              <span className="dim-unit">H</span>
            </div>
          </div>
        </div>

        {/* ── Browser simulation ──────────────────────── */}
        <div className="sidebar-section">
          <div className="section-label">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-3 h-3"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3a9 9 0 010 18M3 12h18" strokeLinecap="round" />
            </svg>
            Browser
          </div>
          <div className="browser-grid">
            {BROWSER_LIST.map((b) => (
              <button
                key={b.id}
                onClick={() => onBrowserModeChange(b.id)}
                title={b.label}
                className={`browser-pill ${b.id === browserMode ? "active" : ""}`}
              >
                <BrowserIcon id={b.id} />
                <span>{BROWSER_PILL_LABEL[b.id] ?? b.shortLabel}</span>
              </button>
            ))}
          </div>
          <LimitationsBadge mode={browserMode} />
        </div>

        {/* ── Zoom ────────────────────────────────────── */}
        <div className="sidebar-section">
          <div className="section-label">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-3 h-3"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3-3M11 8v6M8 11h6" strokeLinecap="round" />
            </svg>
            Zoom
            <span className="zoom-value">{zoomPct}%</span>
          </div>
          <div className="zoom-row">
            <button
              onClick={() => stepZoom(-1)}
              disabled={zoom <= ZOOM_MIN}
              className="zoom-btn"
              title="Zoom out"
            >
              −
            </button>
            <input
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={ZOOM_STEP}
              value={zoom}
              onChange={(e) => onZoomChange(Number(e.target.value))}
              className="zoom-slider"
              title={`${zoomPct}%`}
            />
            <button
              onClick={() => stepZoom(1)}
              disabled={zoom >= ZOOM_MAX}
              className="zoom-btn"
              title="Zoom in"
            >
              +
            </button>
          </div>
        </div>

        {/* ── Background ──────────────────────────────── */}
        <div className="sidebar-section">
          <div className="section-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 15l5-5 4 4 3-3 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Background
          </div>
          <div className="bg-picker-grid">
            <button
              onClick={() => onBackgroundChange(null)}
              className={`bg-picker-none ${background === null ? "active" : ""}`}
              title="Default (theme gradient)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <path d="M3 3l18 18M10.5 6H18a1 1 0 011 1v7.5M6 10.5V18a1 1 0 001 1h7.5" strokeLinecap="round" />
              </svg>
            </button>
            {BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                onClick={() => onBackgroundChange(background === bg.id ? null : bg.id)}
                className={`bg-picker-thumb ${background === bg.id ? "active" : ""}`}
                title={bg.id}
                style={{ backgroundImage: `url(${bg.url})` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <div className="sidebar-footer">
        {hasDeviceFrame && (
          <button
            onClick={onToggleFrame}
            title={showFrame ? "Hide device frame" : "Show device frame"}
            className={`footer-btn ${showFrame ? "footer-btn-active" : ""}`}
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-4 h-4 flex-shrink-0"
            >
              <rect x="5" y="2" width="10" height="16" rx="2" />
              <circle
                cx="10"
                cy="15.5"
                r="0.8"
                fill="currentColor"
                stroke="none"
              />
              <line x1="8" y1="3.5" x2="12" y2="3.5" strokeLinecap="round" />
            </svg>
            <span>Frame</span>
          </button>
        )}
        <button
          onClick={onRefresh}
          title="Reload page"
          className="footer-btn ml-auto"
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 flex-shrink-0"
          >
            <path
              fillRule="evenodd"
              d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.389zm1.26-3.853a.75.75 0 00.219-.53V2.799a.75.75 0 00-1.5 0v2.43l-.31-.31A7 7 0 003.27 8.057a.75.75 0 101.448.389A5.5 5.5 0 0113.92 5.98l.311.311h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.22z"
              clipRule="evenodd"
            />
          </svg>
          <span>Reload</span>
        </button>
        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="footer-btn"
        >
          {theme === "dark" ? (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
              <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>
      </div>
    </aside>
  );
}

# Responsive Viewer Pro

A Chrome extension for frontend developers that lets you preview any website inside realistic device frames — directly in a dedicated viewer window, without leaving your browser.

## Features

- **Realistic device frames** — iPhone (Dynamic Island, Notch, SE), Android, iPad, tablets, MacBook, and generic laptop bezels with 8 colour variants (Space Black, Midnight, Silver, Titanium, and more)
- **Browser simulation** — spoofs User-Agent, `navigator.userAgent`, touch APIs, and `matchMedia` for Chrome, Safari iOS, Safari macOS, Firefox Android, and Firefox Desktop
- **Touch relay** — mouse clicks and drags on mobile/tablet previews are translated into real `TouchEvent`s so tap targets, swipe gestures, and scroll work correctly
- **Continuous zoom** — scale the preview from 10% to 200% in 10% steps via slider or +/− buttons, rendered at full resolution (no blurriness at low zoom)
- **Custom backgrounds** — choose from a set of background images or stick with the default theme gradient
- **Dark / Light mode** — full theme toggle with CSS variable–based theming throughout the UI
- **Persistent state** — device, browser mode, zoom, theme, and background are saved across sessions via `chrome.storage.local`
- **Resizable viewport** — drag handles on the right and bottom edges to freely resize the preview dimensions
- **Custom dimensions** — manually enter width and height for any viewport size

## Tech Stack

- **Chrome Extension MV3** — service worker background, content script in `MAIN` world
- **React 18 + TypeScript** — viewer SPA built with Vite
- **Tailwind CSS + custom CSS** — sidebar and UI components
- **Vitest** — unit tests for zoom logic, device data, and viewer state

## Getting Started

### Prerequisites

- Node.js 18+
- Google Chrome (or any Chromium-based browser)

### Install & Build

```bash
npm install
npm run build
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder

### Development

```bash
npm run dev      # watch mode — rebuilds on file changes
npm run test     # run unit tests
```

After each build, click the refresh icon on the extension card in `chrome://extensions`.

## Project Structure

```
src/
  background/       # Service worker — opens viewer window, manages UA rules
  content/          # ua-override.ts — UA spoof, touch relay, scrollbar hiding
  data/             # Device presets, browser profiles, background images
  popup/            # Extension popup (click the toolbar icon)
  viewer/           # Main viewer SPA
    components/     # Toolbar, DeviceFrame, ViewportFrame
  styles/           # Global CSS with theme tokens
  types.ts          # Shared TypeScript types
```

## License

MIT

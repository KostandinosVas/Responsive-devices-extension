# Forma

**Responsive device preview with real browser simulation for frontend developers.**

Forma is a Chrome extension that lets you instantly preview any webpage across popular mobile, tablet, and desktop device sizes — complete with accurate device frames and browser user-agent simulation — without leaving your current tab.

---

## Features

- **Device presets** — iPhone SE through iPhone 16 Pro, Samsung Galaxy, iPad, MacBook, and more
- **Browser simulation** — Override the UA to emulate Chrome, Safari iOS, Safari macOS, Firefox Android, and Firefox Desktop
- **Device frames** — Rendered device shells (notch, Dynamic Island, SE-style) with colour variants
- **Zoom control** — Fit to viewport or set a custom zoom level
- **Custom dimensions** — Enter any arbitrary width × height
- **Dark / light theme toggle** for the viewer chrome
- **Swappable backgrounds** — Several backdrop options to match your workflow
- **Keyboard shortcut** — `Ctrl+Shift+R` / `Cmd+Shift+R` to toggle the viewer

---

## Tech Stack

| Layer              | Technology                  |
| ------------------ | --------------------------- |
| Extension platform | Chrome Manifest V3          |
| UI                 | React 19 + TypeScript       |
| Styling            | Tailwind CSS v4             |
| Bundler            | Vite + `@crxjs/vite-plugin` |
| Tests              | Vitest + Testing Library    |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Google Chrome (or any Chromium-based browser)

### Install dependencies

```bash
npm install
```

### Development build (with HMR)

```bash
npm run dev
```

### Production build

```bash
npm run build
```

The extension is output to the `dist/` folder.

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` folder

### Run tests

```bash
npm test
```

---

## Usage

1. Navigate to any `http://` or `https://` page.
2. Click the **Forma** toolbar icon (or press `Ctrl+Shift+R`).
3. Select a device preset from the toolbar dropdown.
4. Optionally switch the browser mode to test UA-specific behaviour.
5. Adjust zoom or enter custom dimensions as needed.

---

## License

ISC

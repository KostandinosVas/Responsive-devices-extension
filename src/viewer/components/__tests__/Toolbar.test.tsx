/**
 * Toolbar component tests.
 *
 * Focus areas:
 *  - URL bar normalization (adds https:// when no protocol is given)
 *  - Dimension input validation and commit
 *  - Zoom control rendering and interaction
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toolbar } from "../Toolbar";
import type { BrowserMode } from "../../../types";

function makeProps(overrides: Partial<Parameters<typeof Toolbar>[0]> = {}) {
  return {
    url: "https://example.com",
    width: 390,
    height: 844,
    deviceId: "iphone-14",
    browserMode: "safari-ios" as BrowserMode,
    zoom: 1,
    showFrame: false,
    theme: "dark" as const,
    background: null,
    onUrlChange: vi.fn(),
    onDeviceChange: vi.fn(),
    onBrowserModeChange: vi.fn(),
    onDimensionChange: vi.fn(),
    onZoomChange: vi.fn(),
    onToggleFrame: vi.fn(),
    onThemeToggle: vi.fn(),
    onBackgroundChange: vi.fn(),
    onRefresh: vi.fn(),
    ...overrides,
  };
}

describe("Toolbar — URL bar", () => {
  it("renders the current URL in the input", () => {
    render(<Toolbar {...makeProps()} />);
    expect(screen.getByDisplayValue("https://example.com")).toBeInTheDocument();
  });

  it("prepends https:// when the user omits a protocol", async () => {
    const user = userEvent.setup();
    const onUrlChange = vi.fn();
    render(<Toolbar {...makeProps({ onUrlChange })} />);

    const input = screen.getByPlaceholderText("https://example.com");
    await user.clear(input);
    await user.type(input, "mysite.dev");
    await user.keyboard("{Enter}");

    expect(onUrlChange).toHaveBeenCalledWith("https://mysite.dev");
  });

  it("passes an https:// URL through unchanged", async () => {
    const user = userEvent.setup();
    const onUrlChange = vi.fn();
    render(<Toolbar {...makeProps({ onUrlChange })} />);

    const input = screen.getByPlaceholderText("https://example.com");
    await user.clear(input);
    await user.type(input, "https://secure.io");
    await user.keyboard("{Enter}");

    expect(onUrlChange).toHaveBeenCalledWith("https://secure.io");
  });

  it("passes an http:// URL through unchanged", async () => {
    const user = userEvent.setup();
    const onUrlChange = vi.fn();
    render(<Toolbar {...makeProps({ onUrlChange })} />);

    const input = screen.getByPlaceholderText("https://example.com");
    await user.clear(input);
    await user.type(input, "http://local.test");
    await user.keyboard("{Enter}");

    expect(onUrlChange).toHaveBeenCalledWith("http://local.test");
  });

  it("trims whitespace before normalizing", async () => {
    const user = userEvent.setup();
    const onUrlChange = vi.fn();
    render(<Toolbar {...makeProps({ onUrlChange })} />);

    const input = screen.getByPlaceholderText("https://example.com");
    await user.clear(input);
    await user.type(input, "  example.com  ");
    await user.keyboard("{Enter}");

    expect(onUrlChange).toHaveBeenCalledWith("https://example.com");
  });

  it("does not call onUrlChange for an empty submission", async () => {
    const user = userEvent.setup();
    const onUrlChange = vi.fn();
    render(<Toolbar {...makeProps({ onUrlChange })} />);

    const input = screen.getByPlaceholderText("https://example.com");
    await user.clear(input);
    await user.keyboard("{Enter}");

    expect(onUrlChange).not.toHaveBeenCalled();
  });

  it("clicking the ↵ button submits the URL", async () => {
    const user = userEvent.setup();
    const onUrlChange = vi.fn();
    render(<Toolbar {...makeProps({ onUrlChange })} />);

    const input = screen.getByPlaceholderText("https://example.com");
    await user.clear(input);
    await user.type(input, "vitest.dev");
    await user.click(screen.getByTitle("Navigate (or press Enter)"));

    expect(onUrlChange).toHaveBeenCalledWith("https://vitest.dev");
  });
});

describe("Toolbar — dimension inputs", () => {
  it("renders the current width and height", () => {
    render(<Toolbar {...makeProps({ width: 390, height: 844 })} />);
    expect(screen.getByDisplayValue("390")).toBeInTheDocument();
    expect(screen.getByDisplayValue("844")).toBeInTheDocument();
  });

  it("calls onDimensionChange with the new value on valid width blur", async () => {
    const user = userEvent.setup();
    const onDimensionChange = vi.fn();
    render(
      <Toolbar
        {...makeProps({ width: 390, height: 844, onDimensionChange })}
      />,
    );

    const widthInput = screen.getByTitle("Width (px)");
    await user.clear(widthInput);
    await user.type(widthInput, "768");
    fireEvent.blur(widthInput);

    expect(onDimensionChange).toHaveBeenCalledWith(768, 844);
  });

  it("calls onDimensionChange with the new value on valid height blur", async () => {
    const user = userEvent.setup();
    const onDimensionChange = vi.fn();
    render(
      <Toolbar
        {...makeProps({ width: 390, height: 844, onDimensionChange })}
      />,
    );

    const heightInput = screen.getByTitle("Height (px)");
    await user.clear(heightInput);
    await user.type(heightInput, "1024");
    fireEvent.blur(heightInput);

    expect(onDimensionChange).toHaveBeenCalledWith(390, 1024);
  });

  it("reverts to original width on blur with a value below 200", async () => {
    const user = userEvent.setup();
    const onDimensionChange = vi.fn();
    render(
      <Toolbar
        {...makeProps({ width: 390, height: 844, onDimensionChange })}
      />,
    );

    const widthInput = screen.getByTitle("Width (px)");
    await user.clear(widthInput);
    await user.type(widthInput, "50");
    fireEvent.blur(widthInput);

    expect(onDimensionChange).not.toHaveBeenCalled();
    expect(widthInput).toHaveValue(390);
  });

  it("reverts to original width on blur with a value above 5000", async () => {
    const user = userEvent.setup();
    const onDimensionChange = vi.fn();
    render(
      <Toolbar
        {...makeProps({ width: 390, height: 844, onDimensionChange })}
      />,
    );

    const widthInput = screen.getByTitle("Width (px)");
    await user.clear(widthInput);
    await user.type(widthInput, "9999");
    fireEvent.blur(widthInput);

    expect(onDimensionChange).not.toHaveBeenCalled();
    expect(widthInput).toHaveValue(390);
  });

  it("commits width on Enter key", async () => {
    const user = userEvent.setup();
    const onDimensionChange = vi.fn();
    render(
      <Toolbar
        {...makeProps({ width: 390, height: 844, onDimensionChange })}
      />,
    );

    const widthInput = screen.getByTitle("Width (px)");
    await user.clear(widthInput);
    await user.type(widthInput, "1280");
    await user.keyboard("{Enter}");

    expect(onDimensionChange).toHaveBeenCalledWith(1280, 844);
  });
});

describe("Toolbar — zoom control", () => {
  it("renders the current zoom as a percentage label", () => {
    render(<Toolbar {...makeProps({ zoom: 1 })} />);
    expect(screen.getByTitle("Zoom level")).toHaveTextContent("100%");
  });

  it("renders zoom 0.5 as '50%'", () => {
    render(<Toolbar {...makeProps({ zoom: 0.5 })} />);
    expect(screen.getByTitle("Zoom level")).toHaveTextContent("50%");
  });

  it("clicking '+' calls onZoomChange with the next higher preset", async () => {
    const user = userEvent.setup();
    const onZoomChange = vi.fn();
    render(<Toolbar {...makeProps({ zoom: 1, onZoomChange })} />);

    await user.click(screen.getByTitle("Zoom in"));
    expect(onZoomChange).toHaveBeenCalledWith(1.25);
  });

  it("clicking '−' calls onZoomChange with the next lower preset", async () => {
    const user = userEvent.setup();
    const onZoomChange = vi.fn();
    render(<Toolbar {...makeProps({ zoom: 1, onZoomChange })} />);

    await user.click(screen.getByTitle("Zoom out"));
    expect(onZoomChange).toHaveBeenCalledWith(0.75);
  });

  it("'−' button is disabled at the minimum preset (0.25)", () => {
    render(<Toolbar {...makeProps({ zoom: 0.25 })} />);
    expect(screen.getByTitle("Zoom out")).toBeDisabled();
  });

  it("'+' button is disabled at the maximum preset (2)", () => {
    render(<Toolbar {...makeProps({ zoom: 2 })} />);
    expect(screen.getByTitle("Zoom in")).toBeDisabled();
  });

  it("'−' button is enabled when zoom is above the minimum", () => {
    render(<Toolbar {...makeProps({ zoom: 0.5 })} />);
    expect(screen.getByTitle("Zoom out")).not.toBeDisabled();
  });

  it("'+' button is enabled when zoom is below the maximum", () => {
    render(<Toolbar {...makeProps({ zoom: 1.5 })} />);
    expect(screen.getByTitle("Zoom in")).not.toBeDisabled();
  });

  it("opens a preset dropdown when the label is clicked", async () => {
    const user = userEvent.setup();
    render(<Toolbar {...makeProps({ zoom: 1 })} />);

    await user.click(screen.getByTitle("Zoom level"));
    // All 9 preset labels should now be visible
    const presets = [
      "25%",
      "33%",
      "50%",
      "67%",
      "75%",
      "100%",
      "125%",
      "150%",
      "200%",
    ];
    for (const label of presets) {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("selecting a preset from the dropdown calls onZoomChange", async () => {
    const user = userEvent.setup();
    const onZoomChange = vi.fn();
    render(<Toolbar {...makeProps({ zoom: 1, onZoomChange })} />);

    await user.click(screen.getByTitle("Zoom level"));
    // Click the '50%' preset button inside the dropdown
    const dropdown = screen.getByRole("button", { name: "50%" });
    await user.click(dropdown);
    expect(onZoomChange).toHaveBeenCalledWith(0.5);
  });

  it("shows a Reset button in the dropdown when zoom is not 1", async () => {
    const user = userEvent.setup();
    render(<Toolbar {...makeProps({ zoom: 0.5 })} />);

    await user.click(screen.getByTitle("Zoom level"));
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("does not show Reset button when zoom is already 1", async () => {
    const user = userEvent.setup();
    render(<Toolbar {...makeProps({ zoom: 1 })} />);

    await user.click(screen.getByTitle("Zoom level"));
    expect(
      screen.queryByRole("button", { name: "Reset" }),
    ).not.toBeInTheDocument();
  });

  it("clicking Reset calls onZoomChange(1)", async () => {
    const user = userEvent.setup();
    const onZoomChange = vi.fn();
    render(<Toolbar {...makeProps({ zoom: 0.5, onZoomChange })} />);

    await user.click(screen.getByTitle("Zoom level"));
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(onZoomChange).toHaveBeenCalledWith(1);
  });
});

describe("Toolbar — browser sim indicator", () => {
  it("renders the browser's short label", () => {
    render(<Toolbar {...makeProps({ browserMode: "safari-ios" })} />);
    expect(screen.getByText("Safari iOS")).toBeInTheDocument();
  });

  it("shows a limitations badge for non-chrome browsers", () => {
    render(<Toolbar {...makeProps({ browserMode: "firefox-desktop" })} />);
    expect(screen.getByTitle("Simulation limitations")).toBeInTheDocument();
  });

  it("does not show a limitations badge for Chrome", () => {
    render(<Toolbar {...makeProps({ browserMode: "chrome" })} />);
    expect(
      screen.queryByTitle("Simulation limitations"),
    ).not.toBeInTheDocument();
  });
});

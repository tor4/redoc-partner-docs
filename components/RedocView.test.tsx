import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RedocView from "./RedocView";

const received = vi.hoisted(() => [] as Array<{ spec: object; options: Record<string, unknown> }>);

vi.mock("redoc", () => ({
  RedocStandalone: (props: { spec: object; options: Record<string, unknown> }) => {
    received.push(props);

    return null;
  },
}));

const lastProps = () => received[received.length - 1];

beforeEach(() => {
  received.length = 0;
});

afterEach(() => {
  cleanup();
});

describe("RedocView", () => {
  it("passes the spec through to Redoc", () => {
    const spec = { openapi: "3.0.4" };

    render(<RedocView spec={spec} />);

    expect(lastProps().spec).toBe(spec);
  });

  it("merges options.theme with the partner theme, the partner winning", () => {
    const options = { theme: { colors: { primary: { main: "#111" } }, sidebar: { width: "300px" } } };
    const theme = { colors: { primary: { main: "#222" } } };

    render(<RedocView spec={{}} options={options} theme={theme} />);

    expect(lastProps().options.theme).toEqual({
      colors: { primary: { main: "#222" } },
      sidebar: { width: "300px" },
    });
  });

  it("replaces a whole base theme section with the partner's section", () => {
    const options = { theme: { colors: { primary: { main: "#111" }, text: { primary: "#000" } } } };
    const theme = { colors: { primary: { main: "#222" } } };

    render(<RedocView spec={{}} options={options} theme={theme} />);

    expect(lastProps().options.theme).toEqual({ colors: { primary: { main: "#222" } } });
  });

  it("keeps other options", () => {
    const options = { hideDownloadButton: true };

    render(<RedocView spec={{}} options={options} />);

    expect(lastProps().options.hideDownloadButton).toBe(true);
  });
});

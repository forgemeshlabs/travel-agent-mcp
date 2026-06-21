import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { getAirport, AIRPORTS } from "../src/airports.js";
import { buildExternalBookingLink } from "../src/links.js";
import { getTravelTimingAdvice, isInternationalRoute } from "../src/timing.js";

const root = new URL("..", import.meta.url).pathname;
const scrubPattern = new RegExp([
  ["sky", "scanner"].join(""),
  ["partners", "\\.", "sky", "scanner", "\\.", "net"].join(""),
  ["travel", "payouts"].join(""),
  ["avia", "sales"].join(""),
  ["booking", "\\.", "com"].join(""),
  ["affiliate", " deep-links"].join(""),
  ["tracked", " conversion"].join(""),
  ["hotel", " search"].join(""),
  ["car", " search"].join(""),
  ["flight", " affiliate"].join(""),
  ["partner", " api"].join(""),
  ["affiliate", " program"].join(""),
  ["marker", " 532", "591"].join(""),
  ["532", "591"].join(""),
  ["TRAVEL", "PAYOUTS", "_TO", "KEN"].join(""),
  ["BUY", "_NOW"].join(""),
  "WA" + "IT",
  "FLEX" + "IBLE",
  ["x402", " premium", " intelligence"].join(""),
  ["premium", " intelligence"].join(""),
].join("|"), "i");

const credentialPattern = new RegExp([
  ["api", "[_-]?", "key"].join(""),
  "to" + "ken",
  "sec" + "ret",
  "pass" + "word",
  ["private", "[_-]?", "key"].join(""),
  "bear" + "er",
  "auth" + "orization",
  ["client", "[_-]?", "sec", "ret"].join(""),
].join("|"), "i");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    if (entry === ".git" || entry === "node_modules" || entry === "dist") return [];
    const path = join(dir, entry);
    const stats = statSync(path);
    return stats.isDirectory() ? files(path) : [path];
  });
}

describe("airport lookup", () => {
  it("returns airport for known code", () => {
    const airport = getAirport("JFK");
    expect(airport?.city).toBe("New York");
    expect(airport?.country).toBe("US");
  });

  it("returns null for unknown code", () => {
    expect(getAirport("ZZZ")).toBeNull();
  });

  it("has baseline airport coverage", () => {
    for (const code of ["JFK", "LGA", "EWR", "LAX", "SFO", "ORD", "ATL", "DFW", "IAH", "HOU", "MIA", "LAS", "SEA", "BOS", "DEN"]) {
      expect(AIRPORTS[code], `${code} missing`).toBeDefined();
    }
  });
});

describe("links and timing", () => {
  it("builds external booking links with route params", () => {
    const url = buildExternalBookingLink({ origin: "JFK", destination: "LAX", currency: "USD" });
    expect(url).toContain("origin=JFK");
    expect(url).toContain("destination=LAX");
    expect(url).toContain("currency=USD");
  });

  it("detects domestic routes", () => {
    expect(isInternationalRoute("JFK", "LAX")).toBe(false);
  });

  it("returns general timing guidance", () => {
    const advice = getTravelTimingAdvice(false);
    expect(advice.route_type).toBe("domestic");
    expect(advice.booking_window.min_weeks).toBeGreaterThan(0);
  });
});

describe("public safety", () => {
  it("contains no scrubbed launch or provider terms", () => {
    const hits = files(root)
      .map((path) => [relative(root, path), readFileSync(path, "utf8")] as const)
      .filter(([path, text]) => path !== "tests/public-safety.test.ts" && scrubPattern.test(text));
    expect(hits).toEqual([]);
  });

  it("contains no credential-like wording outside this safety test", () => {
    const hits = files(root)
      .map((path) => [relative(root, path), readFileSync(path, "utf8")] as const)
      .filter(([path, text]) => path !== "tests/public-safety.test.ts" && credentialPattern.test(text));
    expect(hits).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { backendRefusal } from "../src/refusal.js";

describe("backendRefusal", () => {
  it("surfaces the service refusal with status, charged:false and reason", () => {
    const text = '{"ok":false,"error":"invalid_request","charged":false,"message":"Send town, location, or destination so coverage can be scoped.","details":["Required: town, location, or destination"]}';
    const out = backendRefusal({ status: 400, ok: false, text, json: JSON.parse(text) }, "https://x/api/request-coverage");
    expect(out?.isError).toBe(true);
    const body = JSON.parse(out!.content[0].text);
    expect(body).toMatchObject({ ok: false, http_status: 400, charged: false, error: "invalid_request" });
    expect(body.message).toContain("Send town");
    expect(body.details).toEqual(["Required: town, location, or destination"]);
  });

  it("keeps plain-text gateway errors", () => {
    const out = backendRefusal({ status: 502, ok: false, text: "error code: 502", json: null }, "https://x/api/currency-exchange");
    const body = JSON.parse(out!.content[0].text);
    expect(body).toMatchObject({ http_status: 502, charged: false, error: "HTTP 502", body: "error code: 502" });
  });

  it("passes through success, 402 challenges and network failures", () => {
    expect(backendRefusal({ status: 200, ok: true, text: "{}", json: {} }, "e")).toBeNull();
    expect(backendRefusal({ status: 402, ok: false, text: "{}", json: {} }, "e")).toBeNull();
    expect(backendRefusal(null, "e")).toBeNull();
  });
});

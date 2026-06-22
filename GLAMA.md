# Travel Agent MCP for Glama

Canonical MCP server: `travel-agent`

This package is the Glama-facing travel agent surface for agents and travelers.

Start free: category discovery, airport checks, timing advice, currency conversion, and local coverage requests.

Add live x402 travel intelligence when it matters: `$0.01` Travel Pulse disruption and emergency-awareness checks, day-trip planning, weekend getaways, creator experiences, weather-aware planning, and mobility options.

x402 implementation: exact fixed-price USDC on Base, Bazaar route metadata, optional payment identifiers, signed offer/receipt support, and builder-code attribution on the hosted backend.

Use this repository's Dockerfile for the Glama Dockerfile admin page:

```text
https://glama.ai/mcp/servers/forgemeshlabs/travel-agent-mcp/admin/dockerfile
```

If the admin page asks for build steps, use:

```text
npm install
npm run build
npm prune --omit=dev
```

CMD arguments:

```json
["node", "dist/index.js"]
```

Environment variables schema:

```json
{
  "type": "object",
  "properties": {
    "TRAVEL_AGENT_SERVER_URL": {
      "type": "string",
      "description": "Override the ForgeMesh backend base URL. Defaults to https://travel-agent.forgemesh.io."
    }
  },
  "required": []
}
```

Runtime notes:

- Transport: stdio
- Authentication: none
- No inbound HTTP port is required
- Free calls are available for category discovery, airport checks, timing advice, currency conversion, and local coverage requests.
- Travel Pulse is the highlighted high-importance, low-cost service: `$0.01` for one on-demand disruption and emergency-awareness check before a trip, with follow-up checks during the trip when the user or agent asks for updated awareness.
- Travel Pulse is informational only. Results can be incomplete, delayed, or incorrect; users and agents should verify safety-critical decisions with official sources and contact local emergency services in an emergency.
- Paid planning tools point at the live x402 backend and return request metadata for clients that can pay with x402.
- x402 implementation details are advertised by the hosted backend manifest: exact USDC on Base, Bazaar metadata, optional payment identifiers, signed offer/receipt support, and builder-code attribution.
- Keep the package description, README, and Glama metadata aligned with the canonical backend and tool names

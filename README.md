# Travel Agent MCP

AI travel agent MCP for Claude Desktop, Codex-style agent workflows, Hermes, and other MCP clients. It helps agents look up airports, compare routes, explain travel timing, build external booking links, and prepare paid x402 fare-intelligence requests.

## Features

- Look up airport metadata by IATA code
- Compare alternate origin and destination airport routes
- Explain booking windows, airport arrival timing, layovers, and seasonal travel factors
- Build external booking links for selected routes
- Prepare x402 fare-intelligence requests with price, endpoint, and payment metadata
- Run locally with no API key or account setup
- Disclose commission-eligible links in tool output

## Install

```bash
npm install -g @forgemeshlabs/travel-agent-mcp
```

## Claude Desktop

Add this to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "travel-agent": {
      "command": "npx",
      "args": ["-y", "@forgemeshlabs/travel-agent-mcp"]
    }
  }
}
```

Restart Claude Desktop after saving the config, then ask Claude to plan or compare travel routes.

Codex, Hermes, and other MCP-capable agent runtimes can use the same server command:

```bash
npx -y @forgemeshlabs/travel-agent-mcp
```

## Local Run

```bash
npm run build
node dist/index.js
```

## Tools

- `search_travel_options`
- `get_airport_info`
- `compare_routes`
- `build_booking_link`
- `explain_travel_timing`
- `prepare_paid_fare_intelligence_request`

## x402 Fare Intelligence

The paid fare-intelligence handoff points agents to:

```text
GET https://travel.forgemesh.io/api/fare-intelligence
```

Price: `$0.10` USDC per query on Base.

The MCP tool does not hold payment keys or complete payments itself. It prepares the request URL and metadata so an x402-capable client can request the endpoint, receive the `402 Payment Required` challenge, pay, and retry according to the x402 protocol.

## Public Data Boundary

This package uses generic language for provider integrations. Tool responses may include external booking links and commission-eligible links. Booking completion happens with booking partners outside this MCP server. Paid fare intelligence is provided by a separate public x402 endpoint.

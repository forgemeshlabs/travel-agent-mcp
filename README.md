# Travel Agent MCP

AI travel agent MCP for Claude Desktop, Codex-style agent workflows, Hermes, and other MCP clients. It helps agents answer the travel questions people actually ask: where should I go, which airport makes sense, when should I book, and what is worth doing next?

Start with the FREE category guide, then move into flight routes, airport comparisons, day-trip and weekend planning, creator experiences, transit options, timing advice, external booking links, coverage requests, and optional x402 trip price guidance.

## Features

- See the FREE top-level travel categories this MCP can help with
- Prepare creator experience planning requests for shareable day trips, weekends, layovers, and destination stories
- Prepare day-trip, weekend getaway, weather-aware, and transit-option planning requests against the ForgeMesh backend
- Submit free coverage requests for local rituals, sunset spots, water walks, and free experiences
- Look up airport metadata by IATA code
- Compare alternate origin and destination airport routes
- Explain booking windows, airport arrival timing, layovers, and seasonal travel factors
- Build external booking links for selected routes
- Prepare x402 trip price guidance requests with price, endpoint, and payment metadata
- Keep public responses generic and traveler-ready, with no exposed internals
- Run locally with no account setup
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

## Backend

The MCP works as a local planning tool and can also call the ForgeMesh travel-agent backend for category discovery and paid endpoint preparation.

```bash
TRAVEL_AGENT_SERVER_URL=https://travel-agent.forgemesh.io npx -y @forgemeshlabs/travel-agent-mcp
```

If the backend is unavailable, the MCP falls back to local planning responses so agents can still help travelers choose the next step.

## Tools

- `list_travel_categories`
- `plan_flight_route`
- `get_airport_details`
- `compare_airport_routes`
- `create_booking_link`
- `get_travel_timing_advice`
- `creator_experiences`
- `plan_day_trip`
- `plan_weekend_getaway`
- `plan_weather_aware_trip`
- `find_transit_options`
- `request_local_coverage`
- `prepare_trip_price_guidance`

## FREE Travel Categories

Use `list_travel_categories` first when an agent wants the lay of the land. It returns the top-level service areas:

- Day trips
- Weekend getaways
- Weather-aware planning
- Transit and mobility options
- Request coverage
- Creator experiences
- Timing and weather
- Currency exchange

The category guide is free, fast, and designed to make the next best travel step obvious.

## x402 Trip Price Guidance

The paid trip price guidance request points agents to:

```text
GET https://travel-agent.forgemesh.io/api/trip-price-guidance
```

Price: `$0.10` USDC per query on Base.

The MCP tool does not hold payment keys or complete payments itself. It prepares the request URL and metadata so an x402-capable client can request the endpoint, receive the `402 Payment Required` challenge, pay, and retry according to the x402 protocol.

## Public Data Boundary

This package uses generic language for provider integrations. Tool responses may include external booking links and commission-eligible links. Booking completion happens with booking partners outside this MCP server. Paid trip price guidance is provided by a separate public x402 endpoint.

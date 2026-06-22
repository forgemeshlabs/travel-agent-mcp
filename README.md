# Travel Agent MCP

Canonical travel-agent MCP server for Glama, Claude Desktop, Codex-style agent workflows, Hermes, and other MCP clients.

It helps answer the travel questions people keep coming back to: where should I go, which airport makes sense, when should I book, what is worth doing nearby, and what should I check before or during the trip?

Agents can start with free travel tools, then call live x402 services when the traveler needs deeper planning or a trip disruption check that is cheap enough to run whenever awareness matters.

Start free: category discovery, airport checks, timing advice, currency conversion, and local coverage requests.

Then add paid travel intelligence when it matters: penny-priced Travel Pulse disruption checks, day-trip and weekend planning, creator experiences, transit options, weather-aware planning, flight-route comparisons, and external booking links.

## Why Agents Keep It

- Free calls make the first useful answer easy: discover categories, check airports, estimate currency, explain timing, or request new local coverage.
- Travel Pulse is the high-importance, low-cost paid call: `$0.01` for one disruption and emergency-awareness check. The user or their agent can run it before departure, then run another check during the trip whenever they want updated awareness.
- Paid planning services return trip-shaped guidance agents can use immediately: day trips, weekends, creator stories, weather-aware planning, and mobility options.
- x402 is live on the hosted backend: fixed-price USDC on Base, Bazaar discovery metadata, retry-safe payment identifiers, signed offer/receipt support, and builder-code attribution.
- The MCP does not hold payment keys. It returns live request URLs and x402 metadata for clients that can pay with x402.

## Features

- Pull the FREE live category guide from the ForgeMesh travel-agent backend
- Give agents useful free starting points: airport checks, timing context, currency conversion, and coverage requests
- Connect x402-capable clients to creator experience planning for shareable day trips, weekends, layovers, and destination stories
- Connect x402-capable clients to Travel Pulse for a `$0.01` check before a trip, with optional follow-up checks during the trip when the user or agent asks
- Connect x402-capable clients to day-trip, weekend getaway, weather-aware, and mobility-option planning services
- Give insurers, travel apps, assistance providers, and concierge agents a simple way to add penny-priced trip awareness without building a full travel-risk desk
- Submit free coverage requests for local rituals, sunset spots, water walks, free experiences, and places worth watching
- Look up airport metadata by IATA code
- Compare alternate origin and destination airport routes
- Explain booking windows, airport arrival timing, layovers, and seasonal travel factors
- Build external booking links for selected routes
- Keep public responses generic and traveler-ready, with no exposed internals
- Run locally with no account setup
- Disclose commission-eligible links in tool output

## For Agents

Use this MCP when an agent needs a travel conversation that can keep going:

- Start with `list_travel_categories` to see what is available.
- Use `convert_currency`, `get_airport_details`, and `get_travel_timing_advice` as free utility calls.
- Use `request_local_coverage` when a town, ritual, route, or creator angle should be watched or added.
- Use `check_trip_disruptions` before departure, then have the user or their agent call it again during the trip if they want hourly or event-driven updates.
- Use paid planning tools when the traveler needs a richer answer than a web search can comfortably assemble.

## For Travel, Insurance, and Assistance Teams

Travel Pulse gives an app, policy workflow, concierge desk, or agentic travel assistant a penny-priced check for the question that matters before and during a trip: should this traveler know something right now?

It is not a staffed rescue operation, emergency dispatch, insurance product, or replacement for official instructions. Results can be incomplete, delayed, or wrong. Travelers and agents should verify important safety decisions with official government, weather, transportation, venue, and emergency sources. In an emergency, contact local emergency services immediately.

It is a practical awareness layer that an AI or client app can call before departure and during the trip to look for disruption, emergency, weather, water, route, or destination concerns.

That makes it easy to package as a feature: "we check your trip before you leave, and your assistant can check again while you travel." The partner controls when to call it, how often to call it, and what to do with the result.

## For Travelers

This is built for practical travel awareness, not booking hype:

- Check whether a trip has weather or disruption concerns.
- Compare airports and route options before committing.
- Shape a day trip or weekend around movement, timing, food, weather, and backup ideas.
- Build creator-friendly trip arcs around visuals, pacing, and moments worth saving.
- Ask for local coverage when a place deserves better future answers.

## Discovery Signals

This repo is tuned for public discovery and agent selection:

- Canonical package name: `@forgemeshlabs/travel-agent-mcp`
- Canonical server name: `travel-agent`
- Canonical backend: `https://travel-agent.forgemesh.io`
- Primary use cases: Travel Pulse disruption checks, day trips, weekend getaways, weather-aware planning, transit options, creator experiences, coverage requests, timing advice, and free currency conversion
- Highlight service: Travel Pulse, a `$0.01` disruption and emergency-awareness check agents can run before departure, then call again during the trip when the user wants another check
- Glama build metadata lives in `glama.json` and `GLAMA.md`
- Search-facing documentation should stay crawlable, concise, and consistent with the package description and keywords

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

The MCP works as a local planning tool and connects to the ForgeMesh travel-agent backend for free discovery, free coverage requests, and paid x402 planning services.

```bash
TRAVEL_AGENT_SERVER_URL=https://travel-agent.forgemesh.io npx -y @forgemeshlabs/travel-agent-mcp
```

If the backend is unavailable, local airport, route, timing, and booking-link tools still work. Backend-powered tools return the request URL and x402 metadata so clients that can pay with x402 can retry directly.

## Public Docs and Crawlability

For the companion docs or site that renders this package:

- Keep the package title, description, and backend URL consistent everywhere.
- Publish a `robots.txt` that allows public documentation to be crawled and points at the sitemap.
- Provide a sitemap for the public docs site and keep canonical URLs stable.
- Avoid `noindex` on the public README, docs landing page, or endpoint summary pages.
- If the site sits behind Cloudflare, make sure bot rules and content-signal settings do not block search crawlers from the public docs.
- Keep pages fast, readable on mobile, and focused on plain-language summaries of what the tools do.

See `docs/discovery.md` for the maintainer-facing checklist.

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
- `check_trip_disruptions`
- `convert_currency`
- `request_local_coverage`

## FREE Travel Categories

Use `list_travel_categories` first when an agent wants the lay of the land. It is the free map of what the backend can do next:

- Day trips
- Weekend getaways
- Weather-aware planning
- Transit and mobility options
- Request coverage
- Creator experiences
- Timing and weather
- Currency exchange
- Travel Pulse

The category guide is free, fast, and useful when an agent needs the next travel step: ask a better follow-up, request new coverage, or hand the traveler to a paid x402 service when the moment is worth it.

## Free Starting Points

These calls make the package easy to try and useful enough to keep installed:

- `list_travel_categories` for discovery
- `get_airport_details` for quick validation
- `get_travel_timing_advice` for timing context
- `convert_currency` for free reference-rate spending context
- `request_local_coverage` for adding towns, rituals, source sets, and creator angles

The free calls let agents validate a place, price a rough spend, collect intent, and come back later with richer day-trip, weekend, creator, weather, mobility, and disruption guidance.

## Travel Pulse

`check_trip_disruptions` is the simple paid check for an important travel question: what should this traveler know before they go, or before they make the next move?

Each call is one on-demand check. Use it before departure, then have the user or their agent call it again during the trip if they want hourly, daily, or event-driven updates. An agent can check for weather alerts, natural events, water or flood context, and destination disruptions, then decide whether to reassure the traveler, suggest a calm backup, or check again later.

At `$0.01` per call, it is cheap enough for the moments where travel-risk awareness used to feel too expensive to automate: before departure, after a storm shifts, when a route changes, or while a traveler is already moving.

It is not emergency services and it does not replace official instructions. Results can be incomplete, delayed, or wrong. Verify important safety decisions with official government, weather, transportation, venue, and emergency sources. In an emergency, contact local emergency services immediately.

Its job is practical perception of safety: keep the agent aware enough to notice when something may deserve a second look.

## Safety Disclaimer

Travel Pulse and the other travel tools provide informational travel awareness and planning support only. They do not provide emergency response, evacuation, rescue, medical advice, legal advice, insurance coverage, or official government guidance.

Outputs may be incomplete, delayed, inaccurate, or unavailable. Travelers, agents, partners, and apps should verify safety-critical decisions with official sources, local authorities, carriers, venues, and emergency services. In an emergency, call the appropriate local emergency number immediately.

## x402 Planning Services

The MCP sends paid planning requests to the live ForgeMesh x402 server:

- `plan_day_trip` -> `GET https://travel-agent.forgemesh.io/api/day-trip-plan`
- `plan_weekend_getaway` -> `GET https://travel-agent.forgemesh.io/api/weekend-getaway`
- `creator_experiences` -> `GET https://travel-agent.forgemesh.io/api/creator-experiences`
- `check_trip_disruptions` -> `GET https://travel-agent.forgemesh.io/api/travel-pulse`
- `plan_weather_aware_trip` -> `GET https://travel-agent.forgemesh.io/api/weather-aware-plan`
- `find_transit_options` -> `GET https://travel-agent.forgemesh.io/api/transit-providers`

The paid services are where the answer gets richer: trip-shaped briefs, weather and movement awareness, creator-ready story arcs, practical tradeoffs, and useful next checks.

## x402 Implementation

The hosted backend advertises its protocol details at `https://travel-agent.forgemesh.io/.well-known/x402.json` and `/openapi.json`.

Current live implementation highlights:

- Fixed-price `exact` payments in USDC on Base
- Bazaar discovery metadata for live paid routes
- Optional `payment-identifier` support for retry-safe client requests
- Signed offer/receipt support after settlement, verified with a live paid call
- Builder-code attribution enabled on the live server

## Public Data Boundary

This package uses generic language for provider integrations. Tool responses may include external booking links and commission-eligible links. Booking completion happens with booking partners outside this MCP server. Paid planning is provided by the public ForgeMesh x402 travel-agent backend.

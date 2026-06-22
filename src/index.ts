#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getAirport } from "./airports.js";
import { buildExternalBookingLink } from "./links.js";
import { getTravelTimingAdvice, isInternationalRoute } from "./timing.js";

const RESPONSE_BASE = {
  source: "travel-agent-mcp",
  provider_language: "travel search providers",
  integration_language: "provider integrations",
  booking_language: "booking partners",
} as const;

const TRAVEL_AGENT_SERVER_BASE_URL = (process.env.TRAVEL_AGENT_SERVER_URL ?? "https://travel-agent.forgemesh.io").replace(/\/+$/, "");
const X402_NETWORK = "base";
const CREATOR_EXPERIENCES_PRICE = "$0.25";
const DAY_TRIP_PRICE = "$0.10";
const WEEKEND_GETAWAY_PRICE = "$0.25";
const WEATHER_AWARE_PRICE = "$0.03";
const MOBILITY_OPTIONS_PRICE = "$0.01";
const TRAVEL_PULSE_PRICE = "$0.01";
const TRAVEL_PULSE_SAFETY_DISCLAIMER =
  "Travel Pulse is informational travel-risk awareness only. Results can be incomplete, delayed, or incorrect. Verify important safety decisions with official government, weather, transportation, venue, and emergency sources. In an emergency, contact local emergency services immediately.";

function buildServerUrl(path: string, params: Record<string, unknown> = {}) {
  const url = new URL(path, TRAVEL_AGENT_SERVER_BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length) url.searchParams.set(key, value.join(","));
      continue;
    }
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function fetchServerJson(path: string, params: Record<string, unknown> = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(buildServerUrl(path, params), {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body) return null;
    return body;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function buildBackendToolRequest(path: string, params: Record<string, unknown>) {
  return {
    endpoint: `${TRAVEL_AGENT_SERVER_BASE_URL}${path}`,
    method: "GET",
    request_url: buildServerUrl(path, params),
    query: params,
  };
}

function splitList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

const READ_ONLY_LOCAL_TOOL = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const READ_ONLY_EXTERNAL_LINK_TOOL = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

function textResponse(payload: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    isError,
  };
}

const server = new Server(
  { name: "travel-agent-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_travel_categories",
      description:
        "FREE live category guide from the ForgeMesh travel-agent backend. Use this first to see the available travel flows and choose the next useful call: free airport/timing/coverage tools or paid x402 planning services. Read-only, no account setup, no booking side effects.",
      annotations: READ_ONLY_LOCAL_TOOL,
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "plan_flight_route",
      description:
        "Plan one flight route between two airports. Use when a traveler wants a clear starting point for a specific origin and destination; use compare_airport_routes for multiple route choices, create_booking_link only when route details are already known, and get_airport_details only to validate one airport. Read-only, no account setup, no booking side effects. return_date is optional; omit it for one-way trips. Responses include route metadata and may include commission-eligible external booking links.",
      annotations: READ_ONLY_EXTERNAL_LINK_TOOL,
      inputSchema: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Origin airport IATA code (e.g. 'LAX', 'JFK'). Case-insensitive." },
          destination: { type: "string", description: "Destination airport IATA code (e.g. 'LHR', 'NRT'). Case-insensitive." },
          departure_date: { type: "string", description: "Departure date in YYYY-MM-DD format. Optional — omit for open date searches." },
          return_date: { type: "string", description: "Return date in YYYY-MM-DD format. Omit for one-way trips." },
          currency: { type: "string", description: "ISO 4217 currency code (default: USD). Used in booking link parameters." },
        },
        required: ["origin", "destination"],
      },
    },
    {
      name: "get_airport_details",
      description: "FREE look up details for one airport by IATA code. Use to validate or explain a single airport before route planning; use plan_flight_route for an actual trip route and compare_airport_routes for multiple origin-destination pairs. Read-only, no account setup, no external booking links, and no booking side effects.",
      annotations: READ_ONLY_LOCAL_TOOL,
      inputSchema: {
        type: "object",
        properties: {
          code: { type: "string", description: "Three-letter IATA airport code (e.g. 'SFO'). Case-insensitive." },
        },
        required: ["code"],
      },
    },
    {
      name: "compare_airport_routes",
      description: "Compare two or more airport route pairs side by side. Use when a traveler is choosing between alternate origins, destinations, or nearby airports; use plan_flight_route for one dated route and get_airport_details for a single airport lookup. Read-only, no account setup, no booking side effects. Responses may include commission-eligible external booking links for each route.",
      annotations: READ_ONLY_EXTERNAL_LINK_TOOL,
      inputSchema: {
        type: "object",
        properties: {
          routes: {
            type: "array",
            description: "Array of route pairs to compare. Minimum 1, typically 2-5.",
            items: {
              type: "object",
              properties: {
                origin: { type: "string", description: "Origin IATA code" },
                destination: { type: "string", description: "Destination IATA code" },
              },
              required: ["origin", "destination"],
            },
          },
        },
        required: ["routes"],
      },
    },
    {
      name: "create_booking_link",
      description: "Create an external booking link for an already chosen route. Use after route details are known or after compare_airport_routes or plan_flight_route; use another planning tool first when the traveler still needs help choosing. Read-only, no account setup, no booking completion, and no reservation side effects. The returned link may be commission-eligible and is disclosed in output.",
      annotations: READ_ONLY_EXTERNAL_LINK_TOOL,
      inputSchema: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Origin IATA code (e.g. 'IAH'). Case-insensitive." },
          destination: { type: "string", description: "Destination IATA code (e.g. 'CDG'). Case-insensitive." },
          departure_date: { type: "string", description: "Departure date in YYYY-MM-DD format. Optional." },
          return_date: { type: "string", description: "Return date in YYYY-MM-DD format. Optional — omit for one-way." },
          currency: { type: "string", description: "ISO 4217 currency code (default: USD)." },
        },
        required: [],
      },
    },
    {
      name: "get_travel_timing_advice",
      description: "FREE practical travel timing advice, including booking windows, airport arrival timing, layovers, and seasonal considerations. Use for questions like when to book or how early to arrive; use plan_flight_route when the traveler wants route planning. Read-only, no account setup, no external booking link, and no booking side effects.",
      annotations: READ_ONLY_LOCAL_TOOL,
      inputSchema: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Origin IATA code. Optional — used to determine if route is international." },
          destination: { type: "string", description: "Destination IATA code. Optional — used to determine if route is international." },
        },
        required: [],
      },
    },
    {
      name: "convert_currency",
      description:
        "FREE live reference-rate currency conversion from the ForgeMesh travel-agent backend. Use when a traveler or agent needs quick spending context before deciding whether to ask for richer x402 trip guidance. Read-only, no account setup, no payment, and not a transaction quote.",
      annotations: READ_ONLY_EXTERNAL_LINK_TOOL,
      inputSchema: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Amount to convert. Default: 1." },
          from: { type: "string", description: "Source ISO 4217 currency code, such as USD." },
          to: { type: "string", description: "Target ISO 4217 currency code, such as EUR." },
          date: { type: "string", description: "Optional reference date in YYYY-MM-DD format when supported by the backend." },
        },
        required: ["from", "to"],
      },
    },
    {
      name: "creator_experiences",
      description:
        "Connect to the live paid x402 creator-experience service for travelers, creators, influencers, and agents planning a shareable day trip, weekend, layover, or destination story. Use when the traveler cares about visuals, story, timing, food stops, scenic movement, weather-aware backups, or content moments. The MCP can return live server output or x402 request metadata for clients that can pay with x402.",
      annotations: READ_ONLY_EXTERNAL_LINK_TOOL,
      inputSchema: {
        type: "object",
        properties: {
          destination: { type: "string", description: "Destination, city, region, route, or place the influencer experience should be built around." },
          trip_length: { type: "string", description: "Trip length, such as day trip, 24 hours, weekend, layover, or 3 days. Default: day trip." },
          content_style: { type: "string", description: "Desired style, such as cinematic, cozy, budget, food-focused, outdoorsy, romantic, luxury, hidden-gem, or short-form video." },
          budget: { type: "string", description: "Budget preference, such as free, low-cost, mid-range, luxury, or a specific amount." },
          audience: { type: "string", description: "Who the content should speak to, such as couples, solo travelers, families, students, food lovers, or weekend explorers." },
          mobility: { type: "string", description: "Mobility or pace preference, such as easy walking, stroller-friendly, low stairs, car-free, or relaxed." },
          season: { type: "string", description: "Season, month, weather context, or event timing." },
          must_include: { type: "array", description: "Optional list of moments or constraints to include.", items: { type: "string" } },
          avoid: { type: "array", description: "Optional list of things to avoid.", items: { type: "string" } },
        },
        required: ["destination"],
      },
    },
    {
      name: "plan_day_trip",
      description:
        "Connect to the live paid x402 day-trip service for a destination, route, or origin-based ask. Use when a traveler wants a relaxed day out with timing, water, food, transit, weather, and backup options. The MCP can return live server output or x402 request metadata for clients that can pay with x402.",
      annotations: READ_ONLY_EXTERNAL_LINK_TOOL,
      inputSchema: {
        type: "object",
        properties: {
          origin: { type: "string" },
          destination: { type: "string" },
          lat: { type: "string" },
          lon: { type: "string" },
          radius_miles: { type: "string" },
          max_distance_or_travel_time: { type: "string" },
          date: { type: "string" },
          time_window: { type: "string" },
          transportation_modes: { type: "string" },
          interests: { type: "string" },
          theme: { type: "string" },
          content_style: { type: "string" },
          budget: { type: "string" },
          include_local_context: { type: "boolean" },
        },
        required: [],
      },
    },
    {
      name: "plan_weekend_getaway",
      description:
        "Connect to the live paid x402 weekend-getaway service for a short overnight escape. Use when the traveler wants a calmer planning brief with lodging posture, water/weather fit, transportation, and easy backup ideas. The MCP can return live server output or x402 request metadata for clients that can pay with x402.",
      annotations: READ_ONLY_EXTERNAL_LINK_TOOL,
      inputSchema: {
        type: "object",
        properties: {
          origin: { type: "string" },
          destination: { type: "string" },
          lat: { type: "string" },
          lon: { type: "string" },
          start_date: { type: "string" },
          end_date: { type: "string" },
          transportation_modes: { type: "string" },
          max_distance_or_travel_time: { type: "string" },
          budget: { type: "string" },
          lodging_style: { type: "string" },
          trip_style: { type: "string" },
          destination_currency: { type: "string" },
        },
        required: [],
      },
    },
    {
      name: "plan_weather_aware_trip",
      description:
        "Connect to the live paid x402 weather-aware planning service for a destination or coordinate pair. Use when the traveler wants rain, heat, wind, and indoor backup awareness before committing to outdoor time.",
      annotations: READ_ONLY_EXTERNAL_LINK_TOOL,
      inputSchema: {
        type: "object",
        properties: {
          destination: { type: "string" },
          lat: { type: "string" },
          lon: { type: "string" },
          date: { type: "string" },
          time_window: { type: "string" },
          plan_type: { type: "string" },
          transportation_modes: { type: "string" },
          max_distance_or_travel_time: { type: "string" },
        },
        required: [],
      },
    },
    {
      name: "find_transit_options",
      description:
        "Connect to the live paid x402 mobility-options service for a location and transportation type. Use when the traveler wants transit, rail, ferry, trails, bike/scooter options, or a location-filtered short list before planning the rest of the trip.",
      annotations: READ_ONLY_EXTERNAL_LINK_TOOL,
      inputSchema: {
        type: "object",
        properties: {
          location: { type: "string" },
          transportation_type: { type: "string" },
          trip_style: { type: "string" },
          origin: { type: "string" },
          destination: { type: "string" },
        },
        required: [],
      },
    },
    {
      name: "check_trip_disruptions",
      description:
        "Check for travel disruptions before departure or during a trip with the live paid x402 Travel Pulse service. Each $0.01 call is one on-demand disruption and emergency-awareness check: an agent can run it before the traveler leaves, then call it again during the trip if the user wants hourly, daily, or event-driven updates. Use for weather alerts, natural events, water/flood context, route or destination disruption awareness, travel-risk awareness, and calm backup considerations. Informational only: results can be incomplete, delayed, or incorrect. Not emergency services, not staffed monitoring, and not a substitute for official instructions or local emergency authorities.",
      annotations: READ_ONLY_EXTERNAL_LINK_TOOL,
      inputSchema: {
        type: "object",
        properties: {
          destination: { type: "string", description: "Destination, city, region, route, airport area, or place to check." },
          origin: { type: "string", description: "Optional origin or route start." },
          lat: { type: "string", description: "Latitude for a point-specific pulse check." },
          lon: { type: "string", description: "Longitude for a point-specific pulse check." },
          trip_date: { type: "string", description: "Trip date in YYYY-MM-DD format, if known." },
          time_window: { type: "string", description: "Relevant window, such as before departure, next 3 hours, today, overnight, or during trip." },
          check_reason: { type: "string", description: "Why the agent is checking, such as pre_trip, repeat_trip_check, weather_shift, event_day, or traveler_check_in." },
          water_site: { type: "string", description: "Optional water gauge/site id when the traveler cares about flood or river context." },
        },
        required: [],
      },
    },
    {
      name: "request_local_coverage",
      description:
        "FREE live backend call for requesting coverage for a town, neighborhood, local ritual, free experience, or source set. Use this when you want the system to remember a place worth watching: local vibe, freebie list, sunset walk, opening-soon pattern, or creator angle.",
      annotations: READ_ONLY_LOCAL_TOOL,
      inputSchema: {
        type: "object",
        properties: {
          town: { type: "string" },
          location: { type: "string" },
          destination: { type: "string" },
          state: { type: "string" },
          country: { type: "string" },
          county: { type: "string" },
          neighborhood: { type: "string" },
          signal_types: { type: "string" },
          source_links: { type: "string" },
          creator_angle: { type: "string" },
          content_style: { type: "string" },
          contact: { type: "string" },
          notes: { type: "string" },
          recheck_days: { type: "number" },
        },
        required: [],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  switch (name) {
    case "list_travel_categories": {
      const serverResponse = await fetchServerJson("/api/categories");
      if (serverResponse?.ok && serverResponse?.data?.categories) {
        return textResponse({
          ok: true,
          ...RESPONSE_BASE,
          free: true,
          backend: "travel-agent-server",
          results: {
            categories: serverResponse.data.categories,
            best_first_steps: [
              "Use plan_flight_route for a known airport-to-airport trip.",
              "Use compare_airport_routes when nearby airports could save time, stress, or money.",
              "Use convert_currency for free reference-rate spending context.",
              "Use request_local_coverage when a place, ritual, or creator angle should be watched for future travel planning.",
              "Use check_trip_disruptions before departure, then call it again during the trip when the user wants quick disruption or emergency awareness.",
              "Use creator_experiences when the traveler wants a story-led day trip, weekend, layover, or shareable route.",
              "Use plan_day_trip, plan_weekend_getaway, plan_weather_aware_trip, find_transit_options, or check_trip_disruptions when the client can complete x402 payment.",
            ],
          },
        });
      }

      return textResponse({
        ok: false,
        ...RESPONSE_BASE,
        free: true,
        results: {
          backend: "travel-agent-server",
          endpoint: `${TRAVEL_AGENT_SERVER_BASE_URL}/api/categories`,
          request_url: buildServerUrl("/api/categories"),
          error: "Category guide is unavailable from the backend right now.",
        },
      }, true);
    }

    case "plan_flight_route": {
      const origin = String(args.origin ?? "").toUpperCase();
      const destination = String(args.destination ?? "").toUpperCase();
      const departureDate = args.departure_date ? String(args.departure_date) : undefined;
      const returnDate = args.return_date ? String(args.return_date) : undefined;
      const currency = args.currency ? String(args.currency).toUpperCase() : "USD";

      if (!origin || !destination) {
        return textResponse({ ok: false, error: "origin and destination are required" }, true);
      }

      return textResponse({
        ok: true,
        ...RESPONSE_BASE,
        results: {
          route: { origin, destination },
          trip_type: returnDate ? "round_trip" : "one_way",
          departure_date: departureDate ?? null,
          return_date: returnDate ?? null,
          currency,
          provider_integrations: "travel search providers",
          booking_partners: "external booking links",
          link_disclosure: "Results can include commission-eligible links.",
          external_booking_link: buildExternalBookingLink({
            origin,
            destination,
            departure_date: departureDate,
            return_date: returnDate,
            currency,
          }),
        },
      });
    }

    case "get_airport_details": {
      const code = String(args.code ?? "").toUpperCase();
      if (!code) return textResponse({ ok: false, error: "code is required" }, true);
      const airport = getAirport(code);
      if (!airport) return textResponse({ ok: false, ...RESPONSE_BASE, results: null, error: `Airport ${code} not found` }, true);
      return textResponse({ ok: true, ...RESPONSE_BASE, results: airport });
    }

    case "compare_airport_routes": {
      const routes = Array.isArray(args.routes) ? args.routes : [];
      if (routes.length === 0) return textResponse({ ok: false, error: "routes array is required" }, true);

      const comparisons = routes.map((route: Record<string, unknown>) => {
        const origin = String(route.origin ?? "").toUpperCase();
        const destination = String(route.destination ?? "").toUpperCase();
        return {
          route: `${origin}-${destination}`,
          origin,
          destination,
          route_type: isInternationalRoute(origin, destination) ? "international" : "domestic",
          external_booking_link: buildExternalBookingLink({ origin, destination }),
        };
      });

      return textResponse({
        ok: true,
        ...RESPONSE_BASE,
        results: {
          comparisons,
          link_disclosure: "Comparison results can include commission-eligible links from booking partners.",
        },
      });
    }

    case "create_booking_link": {
      const origin = args.origin ? String(args.origin).toUpperCase() : undefined;
      const destination = args.destination ? String(args.destination).toUpperCase() : undefined;
      const departureDate = args.departure_date ? String(args.departure_date) : undefined;
      const returnDate = args.return_date ? String(args.return_date) : undefined;
      const currency = args.currency ? String(args.currency).toUpperCase() : "USD";

      return textResponse({
        ok: true,
        ...RESPONSE_BASE,
        results: {
          external_booking_link: buildExternalBookingLink({
            origin,
            destination,
            departure_date: departureDate,
            return_date: returnDate,
            currency,
          }),
          link_disclosure: "This may be a commission-eligible link from booking partners.",
        },
      });
    }

    case "get_travel_timing_advice": {
      const origin = args.origin ? String(args.origin).toUpperCase() : "";
      const destination = args.destination ? String(args.destination).toUpperCase() : "";
      const routeType = isInternationalRoute(origin, destination);
      return textResponse({
        ok: true,
        ...RESPONSE_BASE,
        results: {
          route: origin && destination ? { origin, destination } : null,
          timing_advice: getTravelTimingAdvice(routeType),
        },
      });
    }

    case "convert_currency": {
      const from = String(args.from ?? "").toUpperCase();
      const to = String(args.to ?? "").toUpperCase();
      if (!from || !to) return textResponse({ ok: false, error: "from and to are required" }, true);

      const params = {
        amount: args.amount ?? 1,
        from,
        to,
        date: args.date,
      };
      const serverResponse = await fetchServerJson("/api/currency-exchange", params);
      if (serverResponse?.ok && serverResponse?.data) {
        return textResponse({
          ok: true,
          ...RESPONSE_BASE,
          backend: "travel-agent-server",
          free: true,
          results: serverResponse.data,
        });
      }

      return textResponse({
        ok: true,
        ...RESPONSE_BASE,
        free: true,
        results: {
          ...buildBackendToolRequest("/api/currency-exchange", params),
          note: "This is a free reference-rate endpoint. Use the request URL directly when the backend is reachable.",
        },
      });
    }

    case "creator_experiences": {
      const destination = String(args.destination ?? "").trim();
      if (!destination) return textResponse({ ok: false, error: "destination is required" }, true);

      const mustInclude = splitList(args.must_include);
      const avoid = splitList(args.avoid);
      const serverResponse = await fetchServerJson("/api/creator-experiences", {
        destination,
        trip_length: args.trip_length,
        content_style: args.content_style,
        budget: args.budget,
        audience: args.audience,
        mobility: args.mobility,
        season: args.season,
        must_include: mustInclude,
        avoid,
      });

      if (serverResponse?.ok && serverResponse?.data) {
        return textResponse({
          ok: true,
          ...RESPONSE_BASE,
          backend: "travel-agent-server",
          results: serverResponse.data,
        });
      }

      return textResponse({
        ok: true,
        ...RESPONSE_BASE,
        results: {
          endpoint: `${TRAVEL_AGENT_SERVER_BASE_URL}/api/creator-experiences`,
          method: "GET",
          request_url: buildServerUrl("/api/creator-experiences", {
            destination,
            trip_length: args.trip_length,
            content_style: args.content_style,
            budget: args.budget,
            audience: args.audience,
            mobility: args.mobility,
            season: args.season,
            must_include: mustInclude,
            avoid,
          }),
          query: {
            destination,
            trip_length: args.trip_length ?? null,
            content_style: args.content_style ?? null,
            budget: args.budget ?? null,
            audience: args.audience ?? null,
            mobility: args.mobility ?? null,
            season: args.season ?? null,
            must_include: mustInclude,
            avoid,
          },
          x402: {
            price: CREATOR_EXPERIENCES_PRICE,
            network: X402_NETWORK,
            flow: "Request the URL, handle the 402 Payment Required challenge, complete x402 payment, then retry the same request.",
          },
          expected_paid_output: {
            fields: ["summary", "story_arc", "experience_options", "weather_fit", "tradeoffs", "follow_up_checks"],
            response_style: "Creator-ready planning brief with useful surprises, follow-up checks, and no exposed internal source mechanics.",
          },
        },
      });
    }

    case "plan_day_trip": {
      const destination = String(args.destination ?? "").trim();
      const origin = String(args.origin ?? "").trim();
      if (!destination && !origin) return textResponse({ ok: false, error: "origin or destination is required" }, true);

      const params = {
        origin,
        destination,
        lat: args.lat,
        lon: args.lon,
        radius_miles: args.radius_miles,
        max_distance_or_travel_time: args.max_distance_or_travel_time,
        date: args.date,
        time_window: args.time_window,
        transportation_modes: args.transportation_modes,
        interests: args.interests,
        theme: args.theme,
        content_style: args.content_style,
        budget: args.budget,
        include_local_context: args.include_local_context,
      };
      const serverResponse = await fetchServerJson("/api/day-trip-plan", params);
      if (serverResponse?.ok && serverResponse?.data) {
        return textResponse({
          ok: true,
          ...RESPONSE_BASE,
          backend: "travel-agent-server",
          results: serverResponse.data,
        });
      }

      return textResponse({
        ok: true,
        ...RESPONSE_BASE,
        results: {
          ...buildBackendToolRequest("/api/day-trip-plan", params),
          x402: {
            price: DAY_TRIP_PRICE,
            network: X402_NETWORK,
            flow: "Request the URL, handle the 402 Payment Required challenge, complete x402 payment, then retry the same request.",
          },
          expected_paid_output: {
            fields: ["experience_options", "planning_awareness", "weather_context", "travel_time_context", "cost_context", "follow_up_checks"],
            response_style: "Trip-shaped guidance with useful surprises, practical tradeoffs, and no exposed internal source mechanics.",
          },
        },
      });
    }

    case "plan_weekend_getaway": {
      const params = {
        origin: args.origin,
        destination: args.destination,
        lat: args.lat,
        lon: args.lon,
        start_date: args.start_date,
        end_date: args.end_date,
        transportation_modes: args.transportation_modes,
        max_distance_or_travel_time: args.max_distance_or_travel_time,
        budget: args.budget,
        lodging_style: args.lodging_style,
        trip_style: args.trip_style,
        destination_currency: args.destination_currency,
      };
      const serverResponse = await fetchServerJson("/api/weekend-getaway", params);
      if (serverResponse?.ok && serverResponse?.data) {
        return textResponse({
          ok: true,
          ...RESPONSE_BASE,
          backend: "travel-agent-server",
          results: serverResponse.data,
        });
      }
      return textResponse({
        ok: true,
        ...RESPONSE_BASE,
        results: {
          ...buildBackendToolRequest("/api/weekend-getaway", params),
          x402: {
            price: WEEKEND_GETAWAY_PRICE,
            network: X402_NETWORK,
            flow: "Request the URL, handle the 402 Payment Required challenge, complete x402 payment, then retry the same request.",
          },
        },
      });
    }

    case "plan_weather_aware_trip": {
      const params = {
        destination: args.destination,
        lat: args.lat,
        lon: args.lon,
        date: args.date,
        time_window: args.time_window,
        plan_type: args.plan_type,
        transportation_modes: args.transportation_modes,
        max_distance_or_travel_time: args.max_distance_or_travel_time,
      };
      const serverResponse = await fetchServerJson("/api/weather-aware-plan", params);
      if (serverResponse?.ok && serverResponse?.data) {
        return textResponse({
          ok: true,
          ...RESPONSE_BASE,
          backend: "travel-agent-server",
          results: serverResponse.data,
        });
      }
      return textResponse({
        ok: true,
        ...RESPONSE_BASE,
        results: {
          ...buildBackendToolRequest("/api/weather-aware-plan", params),
          x402: {
            price: WEATHER_AWARE_PRICE,
            network: X402_NETWORK,
            flow: "Request the URL, handle the 402 Payment Required challenge, complete x402 payment, then retry the same request.",
          },
        },
      });
    }

    case "find_transit_options": {
      const params = {
        location: args.location,
        transportation_type: args.transportation_type,
        trip_style: args.trip_style,
        origin: args.origin,
        destination: args.destination,
      };
      const serverResponse = await fetchServerJson("/api/transit-providers", params);
      if (serverResponse?.ok && serverResponse?.data) {
        return textResponse({
          ok: true,
          ...RESPONSE_BASE,
          backend: "travel-agent-server",
          results: serverResponse.data,
        });
      }
      return textResponse({
        ok: true,
        ...RESPONSE_BASE,
        results: {
          ...buildBackendToolRequest("/api/transit-providers", params),
          x402: {
            price: MOBILITY_OPTIONS_PRICE,
            network: X402_NETWORK,
            flow: "Request the URL, handle the 402 Payment Required challenge, complete x402 payment, then retry the same request.",
          },
        },
      });
    }

    case "check_trip_disruptions": {
      const params = {
        destination: args.destination,
        origin: args.origin,
        lat: args.lat,
        lon: args.lon,
        trip_date: args.trip_date,
        time_window: args.time_window,
        check_reason: args.check_reason,
        water_site: args.water_site,
      };
      const serverResponse = await fetchServerJson("/api/travel-pulse", params);
      if (serverResponse?.ok && serverResponse?.data) {
        return textResponse({
          ok: true,
          ...RESPONSE_BASE,
          backend: "travel-agent-server",
          safety_disclaimer: TRAVEL_PULSE_SAFETY_DISCLAIMER,
          results: serverResponse.data,
        });
      }
      return textResponse({
        ok: true,
        ...RESPONSE_BASE,
        results: {
          ...buildBackendToolRequest("/api/travel-pulse", params),
          x402: {
            price: TRAVEL_PULSE_PRICE,
            network: X402_NETWORK,
            flow: "Request the URL, handle the 402 Payment Required challenge, complete x402 payment, then retry the same request.",
          },
          use_case: "Penny-priced travel-risk awareness for one on-demand disruption and emergency check before a trip, with follow-up checks during the trip when the user or agent asks for updated awareness.",
          safety_disclaimer: TRAVEL_PULSE_SAFETY_DISCLAIMER,
          expected_paid_output: {
            fields: ["summary", "severity", "disruptions", "freshness", "traveler_relevance", "backup_considerations", "next_check"],
            response_style: "Calm travel pulse with concise disruptions, official-channel caveats, a safety disclaimer, and a suggested next check.",
          },
        },
      });
    }

    case "request_local_coverage": {
      const params = {
        town: args.town,
        location: args.location,
        destination: args.destination,
        state: args.state,
        country: args.country,
        county: args.county,
        neighborhood: args.neighborhood,
        signal_types: args.signal_types,
        source_links: args.source_links,
        creator_angle: args.creator_angle,
        content_style: args.content_style,
        contact: args.contact,
        notes: args.notes,
        recheck_days: args.recheck_days,
      };
      const serverResponse = await fetchServerJson("/api/request-coverage", params);
      if (serverResponse?.ok && serverResponse?.data) {
        return textResponse({
          ok: true,
          ...RESPONSE_BASE,
          backend: "travel-agent-server",
          free: true,
          results: serverResponse.data,
        });
      }
      return textResponse({
        ok: true,
        ...RESPONSE_BASE,
        free: true,
        results: {
          ...buildBackendToolRequest("/api/request-coverage", params),
          note: "This is a free coverage request. The backend adds the town or source set to the future local-vibe coverage queue.",
        },
      });
    }

    default:
      return textResponse({ ok: false, error: `Unknown tool: ${name}` }, true);
  }
});

const transport = new StdioServerTransport();
const stdinLifetime = setInterval(() => undefined, 2_147_483_647);
process.once("SIGINT", () => clearInterval(stdinLifetime));
process.once("SIGTERM", () => clearInterval(stdinLifetime));
process.stdin.resume();
void server.connect(transport);

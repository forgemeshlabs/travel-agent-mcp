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

const FARE_INTELLIGENCE_BASE_URL = "https://travel.forgemesh.io/api/fare-intelligence";
const FARE_INTELLIGENCE_PRICE = "$0.10";
const FARE_INTELLIGENCE_NETWORK = "base";

function buildFareIntelligenceUrl(params: {
  origin: string;
  destination: string;
  departure_at?: string;
  return_at?: string;
  currency?: string;
  market?: string;
}) {
  const search = new URLSearchParams();
  search.set("origin", params.origin.toUpperCase());
  search.set("destination", params.destination.toUpperCase());
  if (params.departure_at) search.set("departure_at", params.departure_at);
  if (params.return_at) search.set("return_at", params.return_at);
  search.set("currency", (params.currency ?? "USD").toUpperCase());
  search.set("market", (params.market ?? "us").toLowerCase());
  return `${FARE_INTELLIGENCE_BASE_URL}?${search.toString()}`;
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
      name: "search_travel_options",
      description:
        "Primary travel search workflow for one origin-destination airport pair. Use when the user wants flight/trip options for a specific route; use compare_routes for multiple routes, build_booking_link only when route details are already known, and get_airport_info only to validate one airport. Read-only, no authentication, no booking side effects. return_date is optional; omit it for one-way trips. Responses include route metadata and may include commission-eligible external booking links.",
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
      name: "get_airport_info",
      description: "Look up metadata for one airport by IATA code. Use to validate or explain a single airport code before route planning; use search_travel_options for an actual trip search and compare_routes for multiple origin-destination pairs. Read-only, no authentication, no external booking links, and no booking side effects.",
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
      name: "compare_routes",
      description: "Compare two or more airport route pairs side by side. Use when the user is choosing between alternate origins, destinations, or airports; use search_travel_options for one dated route and get_airport_info for a single airport lookup. Read-only, no authentication, no booking side effects. Responses may include commission-eligible external booking links for each route.",
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
      name: "build_booking_link",
      description: "Generate only an external booking link for an already chosen route. Use after route details are known or after compare_routes/search_travel_options; do not use as the first step when the user still needs search guidance. Read-only, no authentication, no booking completion, and no reservation side effects. The returned link may be commission-eligible and is disclosed in output.",
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
      name: "explain_travel_timing",
      description: "Explain general travel timing and logistics, including booking windows, airport arrival timing, layovers, and seasonal considerations. Use for advice questions like when to book or how early to arrive; use search_travel_options when the user wants route-specific flight search. Read-only, no authentication, no external booking link, and no booking side effects.",
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
      name: "prepare_paid_fare_intelligence_request",
      description: "Prepare a paid x402 fare-intelligence request for a specific flight route. Use when the user wants a fare recommendation, historical median context, or route price intelligence and the client can complete x402 payment. This tool does not complete payment itself; it returns the public endpoint URL, price, network, and request metadata. Read-only, no authentication inside the MCP server, no booking side effects.",
      annotations: READ_ONLY_EXTERNAL_LINK_TOOL,
      inputSchema: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Origin airport IATA code (e.g. 'JFK'). Case-insensitive." },
          destination: { type: "string", description: "Destination airport IATA code (e.g. 'LAX'). Case-insensitive." },
          departure_at: { type: "string", description: "Departure date or month in YYYY-MM-DD or YYYY-MM format. Optional." },
          return_at: { type: "string", description: "Return date or month in YYYY-MM-DD or YYYY-MM format. Optional for one-way trips." },
          currency: { type: "string", description: "ISO 4217 currency code (default: USD)." },
          market: { type: "string", description: "ISO 3166-1 market code (default: us)." },
        },
        required: ["origin", "destination"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  switch (name) {
    case "search_travel_options": {
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

    case "get_airport_info": {
      const code = String(args.code ?? "").toUpperCase();
      if (!code) return textResponse({ ok: false, error: "code is required" }, true);
      const airport = getAirport(code);
      if (!airport) return textResponse({ ok: false, ...RESPONSE_BASE, results: null, error: `Airport ${code} not found` }, true);
      return textResponse({ ok: true, ...RESPONSE_BASE, results: airport });
    }

    case "compare_routes": {
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

    case "build_booking_link": {
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

    case "explain_travel_timing": {
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

    case "prepare_paid_fare_intelligence_request": {
      const origin = String(args.origin ?? "").toUpperCase();
      const destination = String(args.destination ?? "").toUpperCase();
      const departureAt = args.departure_at ? String(args.departure_at) : undefined;
      const returnAt = args.return_at ? String(args.return_at) : undefined;
      const currency = args.currency ? String(args.currency).toUpperCase() : "USD";
      const market = args.market ? String(args.market).toLowerCase() : "us";

      if (!origin || !destination) {
        return textResponse({ ok: false, error: "origin and destination are required" }, true);
      }

      return textResponse({
        ok: true,
        ...RESPONSE_BASE,
        results: {
          route: { origin, destination },
          trip_type: returnAt ? "round_trip" : "one_way",
          endpoint: FARE_INTELLIGENCE_BASE_URL,
          method: "GET",
          request_url: buildFareIntelligenceUrl({
            origin,
            destination,
            departure_at: departureAt,
            return_at: returnAt,
            currency,
            market,
          }),
          query: {
            origin,
            destination,
            departure_at: departureAt ?? null,
            return_at: returnAt ?? null,
            currency,
            market,
          },
          x402: {
            price: FARE_INTELLIGENCE_PRICE,
            network: FARE_INTELLIGENCE_NETWORK,
            flow: "Request the URL, handle the 402 Payment Required challenge, complete x402 payment, then retry the same request.",
          },
          expected_paid_output: {
            fields: ["price", "currency", "historical_median", "recommendation", "confidence"],
            recommendation_values: "Provider-specific buy-or-delay guidance.",
          },
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

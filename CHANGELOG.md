# Changelog

## 0.3.0 - 2026-11-13

- Aligned every paid tool with the live route contracts: descriptions, prices, data limits and refusal rules now quote the live service (day trips, weekend, weather, creator, transit, Travel Pulse).
- Schema change: `check_trip_disruptions` now takes `lat` and `lon` (required) plus `radius_miles`, `lookback_hours`, `signal_types`, `trip_phase`, `water_site`; the destination/origin/trip_date/time_window/check_reason inputs were removed because the live route does not geocode or use them. `find_transit_options` requires `location`.
- Backend refusals (HTTP 400/429/5xx) are now returned with `http_status`, `charged:false` and the service reason instead of a generic fallback.

## 0.2.6 - 2026-10-26

- Dependency security release, no functional change: body-parser 2.4.0, fast-uri 3.1.9, ip-address 10.7.5, zod pinned to 4.6.x via overrides (GHSA-27r3-jxmh-p828, GHSA-mrhx-c7xc-m3w5, GHSA-rxp7-6hxx-x8q5, fast-uri advisories).


## 0.1.0

- Started Travel Agent MCP from the clean travel assistant server.
- Added x402 trip price guidance request preparation.

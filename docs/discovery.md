# Discovery and Crawl Guidance

This repo is the canonical public surface for `@forgemeshlabs/travel-agent-mcp`.
Keep the package description, README, Glama metadata, and backend URL aligned:

- Canonical server name: `travel-agent`
- Canonical backend: `https://travel-agent.forgemesh.io`
- Main topics: Travel Pulse disruption checks, day trips, weekend getaways, weather-aware planning, transit options, creator experiences, coverage requests, timing advice, and free currency conversion
- Highlight Travel Pulse as the `$0.01` disruption and emergency-awareness check agents can run before a trip, then call again during the trip when the user wants another check
- Partner angle: insurers, travel apps, assistance providers, and concierge agents can have their AI call Travel Pulse before departure and during covered trips
- Always keep the Travel Pulse safety disclaimer visible: informational only, may be incomplete/delayed/incorrect, verify with official sources, contact local emergency services in an emergency
- Lead with plain traveler and agent language: practical travel awareness, free starting points, and live x402 paid follow-ups
- Keep x402 trust highlights visible: exact USDC on Base, Bazaar metadata, optional payment identifiers, signed offer/receipt support, and builder-code attribution

## Google Search Guidance

Follow the basics from Google Search Central:

- Use a clear page title and one-sentence summary of what the package does
- Keep public docs crawlable
- Use stable canonical URLs
- Publish a sitemap for the docs site
- Avoid `noindex` on public docs and README-style landing pages
- Keep content useful, specific, and written for people first
- Keep the page fast and mobile friendly

## Cloudflare Guidance

If the docs site is behind Cloudflare:

- Allow public documentation to be crawled
- Serve `robots.txt` at the docs origin with the sitemap URL
- Do not block the docs with WAF or bot rules
- Keep any content-signal policy consistent with public search discovery
- Use Cloudflare for delivery and protection, not for hiding the public docs

## Glama Guidance

- Keep `glama.json` minimal and valid
- Keep `GLAMA.md` focused on build, runtime, and environment settings
- Keep the README and Glama admin instructions in sync
- Make the tool names and category language match the live server

## Maintainability Notes

- Prefer plain language in public docs
- Avoid internal growth language; use plain traveler and agent wording
- Keep discovery copy short and consistent
- Update this guide whenever the package name, backend URL, or tool surface changes

# Glama release build

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
  "properties": {},
  "required": []
}
```

Runtime notes:

- Transport: stdio
- Authentication: none
- No inbound HTTP port is required

# md2x MCP server (Express)

This folder contains an MCP (Model Context Protocol) server that exposes `md2x` capabilities (Markdown -> HTML/PDF/DOCX) over HTTP.

## Run

```bash
pnpm -C mcp install
pnpm -C mcp start
```

By default it listens on `http://localhost:3001`.

## Endpoints

- Streamable HTTP (recommended): `POST/GET/DELETE /mcp`
- Legacy HTTP+SSE: `GET /sse` and `POST /messages?sessionId=...`
- Resources (static files): `GET /resources/*`

## Tools (MCP)

All tools return JSON: `{ format, mimeType, url }`

- `md2x_to_html` - Convert markdown to HTML
- `md2x_to_pdf` - Convert markdown to PDF
- `md2x_to_docx` - Convert markdown to DOCX
- `md2x_convert` - Auto convert via `md2x.convert()` (front matter supported)

## Environment Variables

Create a `.env` file in the `mcp` directory:

```env
PORT=3001
MD2X_RESOURCES_BASE_URL=http://localhost:3001/resources
```

- `PORT` - Server port (default: `3000`)
- `MD2X_RESOURCES_BASE_URL` - Base URL for file downloads (optional, auto-generated from `PORT` if not set)

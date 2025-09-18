# NestJS MCP Server Module

<div align="center">
  <img src="https://raw.githubusercontent.com/rekog-labs/MCP-Nest/main/image.png" height="200">

[![CI][ci-image]][ci-url]
[![Code Coverage][code-coverage-image]][code-coverage-url]
[![NPM Version][npm-version-image]][npm-url]
[![NPM Downloads][npm-downloads-image]][npm-url]
[![NPM License][npm-license-image]][npm-url]

</div>

A NestJS module to effortlessly expose tools, resources, and prompts for AI, from your NestJS applications using the **Model Context Protocol (MCP)**.

With `@rekog/mcp-nest` you define tools, resources, and prompts in a way that's familiar in NestJS and leverage the full power of dependency injection to utilize your existing codebase in building complex enterprise ready MCP servers.

## Features

- 🚀 **[Multi-Transport Support](docs/server-examples.md#multiple-transport-types)**: HTTP+SSE, Streamable HTTP, and STDIO
- 🔧 **[Tools](docs/tools.md)**: Expose NestJS methods as MCP tools with automatic discovery and Zod validation
  - 🛠️ **[Elicitation](docs/tools.md#interactive-tool-calls)**: Interactive tool calls with user input elicitation
  - 📊 **[Progress Notifications](docs/tools.md#tool-with-progress-reporting)**: Real-time progress updates for long-running operations
  - 🌐 **[HTTP Request Access](docs/tools.md#understanding-tool-method-parameters)**: Full access to request context within MCP handlers
- 📁 **[Resources](docs/resources.md)**: Serve content and data through MCP resource system
- 📚 **[Resource Templates](docs/resource-templates.md)**: Dynamic resources with parameterized URIs
- 💬 **[Prompts](docs/prompts.md)**: Define reusable prompt templates for AI interactions
- 🔐 **[Guard-based Authentication](docs/server-examples.md#server-with-authentication)**: Guard-based security with OAuth support
- 🏠 **[Built-in Authorization Server](docs/built-in-authorization-server.md)** — Using the built-in Authorization Server for easy setups. **(Beta)**
- 🌐 **[External Authorization Server](docs/external-authorization-server/README.md)** — Securing your MCP server with an external authorization server (Keycloak, Auth0, etc).
- 💉 **[Dependency Injection](docs/dependency-injection.md)**: Leverage NestJS DI system throughout MCP components

## Installation

```bash
npm install @rekog/mcp-nest @modelcontextprotocol/sdk zod@^3
```

### Optional dependencies

If you use the built-in authorization server with the TypeORM store, install the following optional peer dependencies:

```bash
npm install @nestjs/typeorm typeorm
```

## Quick Start

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { McpModule } from '@rekog/mcp-nest';
import { GreetingTool } from './greeting.tool';

@Module({
  imports: [
    McpModule.forRoot({
      name: 'my-mcp-server',
      version: '1.0.0',
    }),
  ],
  providers: [GreetingTool],
})
export class AppModule {}
```

```typescript
// greeting.tool.ts
import { Injectable } from '@nestjs/common';
import { Tool, Context } from '@rekog/mcp-nest';
import { z } from 'zod';

@Injectable()
export class GreetingTool {
  @Tool({
    name: 'greeting-tool',
    description: 'Returns a greeting with progress updates',
    parameters: z.object({
      name: z.string().default('World'),
    }),
  })
  async sayHello({ name }, context: Context) {
    await context.reportProgress({ progress: 50, total: 100 });
    return `Hello, ${name}!`;
  }
}
```

## Documentation

- **[Tools Guide](docs/tools.md)** - Define and expose NestJS methods as MCP tools
- **[Resources Guide](docs/resources.md)** - Serve static and dynamic content
- **[Resource Templates Guide](docs/resource-templates.md)** - Create parameterized resources
- **[Prompts Guide](docs/prompts.md)** - Build reusable prompt templates
- **[Built-in Authorization Server](docs/built-in-authorization-server.md)** - Secure your MCP server with built-in OAuth
- **[External Authorization Server](docs/external-authorization-server/README.md)** - Securing your MCP server with an external authorization server (Keycloak, Auth0, etc)
- **[Server examples](docs/server-examples.md)** - MCP servers examples (Streamable HTTP, HTTP, and STDIO) and with Fastify support

## Supabase Mode (Virtual Server Config)

Enable a mode where the MCP server receives an `mcp-server-id` and derives its initialize response and tools from Supabase tables documented in `SyntharaAIStudio/virtualmcpserver/docs/mcp/tables`.

- Configure in `McpModule.forRoot({ supabase: { enabled: true, url: process.env.SUPABASE_URL } })` and provide `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_KEY`.
- Request header, query, oder Pfadparameter für die Server‑ID:
  - Header: `mcp-server-id` (configurable via `supabase.serverIdHeader`)
  - Query: `mcpServerId` (configurable via `supabase.serverIdQueryParam`)
  - Pfad: `/mcp/:mcpServerId` (Streamable HTTP), `/sse/:mcpServerId` und `/messages/:mcpServerId` (SSE)
- Tables (override via `supabase.tables`):
  - `advisori_mcp_server` → initialize: sets `serverInfo.name`, `version`, and `instructions`.
  - `advisori_mcp_tool_config` → tools/list: reads `toolKey` and `inputSchema` filtered by `mcpServerId`.

Example: tools/list registers tools like:

```
{"tools":[{"name":"send_email","inputSchema":{"type":"object","required":["to","subject","body"]}}]}
```

Fallback: If no server id is supplied or Supabase is disabled, discovery-based tools (decorators) are returned.

## Tool Calls → Serverless Forwarding

Bei `tools/call` mit gesetzter Server‑ID wird das Tool per Mapping in Supabase an eine Serverless‑Function weitergeleitet:
- Mapping: `advisori_mcp_tool_connector_map` (Tool → Connector)
- Ziel: `advisori_connector_service.base_url`
- Transforms: `advisori_mcp_tool_transform` (direction=`request`/`response`, `is_active=true`)
- Payload (POST):

```
{
  "mcpToolRequest": { "name": "<toolKey>", "arguments": {…}, "inputSchema": {…} },
  "transformRequest": "function…",
  "transformResponse": "function… | null",
  "customHeader": { "authorization": "…", "x-…": "…" },
  "mcpServerId": "<uuid>"
}
```

Antwort der Function wird an den MCP‑Client zurückgegeben. Falls kein Mapping/Transform existiert, erfolgt Fallback auf lokal registrierte (@Tool) Implementierungen.

Hinweis Allowlist (Wildcard):
- In `supabase.connectorHttp.allowlistHosts` kannst du `*` (alles erlauben) oder Wildcards nutzen (z. B. `*.example.com`, `api.*.internal`).
- Ist die Liste leer oder nicht gesetzt, sind alle Hosts erlaubt (optional).

1. ja ## Consent für statische Secrets

Statt OAuth‑Flows können Kunden statische Schlüssel (z. B. Postgres‑URL, X‑API‑Key) hinterlegen. Der MCP‑Server speichert diese pro Nutzer und nutzt sie bei Tool‑Calls automatisch.

- GET `${apiPrefix}/remote-auth/consent?serverId|connectorId&returnUrl=` → HTML‑Form mit benötigten Feldern (aus `advisori_mcp_required_secret_ref`).
- POST `${apiPrefix}/remote-auth/consent/submit` → speichert Werte in `advisori_secretmanager` und legt Bindings in `advisori_mcp_user_secret_binding` an.
- Bei `tools/call` werden Secrets aufgelöst (Header/Args > User‑Bindings > ADMIN‑Secrets) und als `customHeader` an die Serverless‑Function übergeben.

Direktübergabe ohne Consent: per Header (`X-Secret-Header-<Name>: <Value>`, `...-Id: <secret_id>`) oder als `arguments._secrets = { "<Name>": "<Value>" }`.

## Provider‑agnostisches Pre‑Auth + OAuth/API‑Key

Vor dem eigentlichen Login/Token‑Bezug können mandantenspezifische Provider‑Parameter erhoben und gespeichert werden.

- Provider‑Katalog (DB): `public.auth_provider_catalog` mit `flow_type`, URL‑Templates (`{tenant}`), `form_schema` und `headers_blueprint`.
- Routen:
  - `GET ${apiPrefix}/remote-auth/provider/:provider/begin?serverId=&toolId=&mode=&returnUrl=` → Formular gem. `form_schema`.
  - `POST ${apiPrefix}/remote-auth/provider/:provider/submit` → speichert Felder, legt `advisori_mcp_auth_profile` an und verknüpft `serverId` via `advisori_mcp_server_auth_map` oder `toolId` via `advisori_mcp_tool_auth_map`.
  - `GET ${apiPrefix}/remote-auth/provider/:provider/preview` → liefert Provider‑Blueprint als JSON (form_schema, URLs, flow_type).
  - `GET ${apiPrefix}/remote-auth/provider/:provider/begin.json?serverId=&toolId=&mode=&returnUrl=` → JSON‑Variante des Formular‑Schemas (für eigene UI).
  - `POST ${apiPrefix}/remote-auth/provider/:provider/submit.json` (Body: `{ server_id|tool_id, mode, fields:{...} }`) → JSON‑Antwort `{ status:'ok', profileId }`.
- Modus (`mode`): `pkce` | `cc` | `api_key` | `basic` (steuert Profiltyp/Spalten).
- Migrationen: `sql/2025-09-18_create_auth_provider_catalog.sql`, `sql/2025-09-18_create_or_update_required_secret_ref.sql`.

## Playground

The `playground` directory contains working examples for all features.
Refer to [`playground/README.md`](playground/README.md) for details.

<!-- Badges -->
[ci-url]: https://github.com/rekog-labs/MCP-Nest/actions/workflows/pipeline.yml
[ci-image]: https://github.com/rekog-labs/MCP-Nest/actions/workflows/pipeline.yml/badge.svg
[npm-url]: https://www.npmjs.com/package/@rekog/mcp-nest
[npm-version-image]: https://img.shields.io/npm/v/@rekog/mcp-nest
[npm-downloads-image]: https://img.shields.io/npm/dm/@rekog/mcp-nest
[npm-license-image]: https://img.shields.io/npm/l/@rekog/mcp-nest
[code-coverage-url]: https://codecov.io/gh/rekog-labs/mcp-nest
[code-coverage-image]: https://codecov.io/gh/rekog-labs/mcp-nest/branch/main/graph/badge.svg
- Supabase → MCP Token Bridge:
  - `POST ${apiPrefix}/remote-auth/bridge/supabase-to-mcp` (Authorization: Bearer <Supabase JWT> oder Body.supabase_token)
  - Server verifiziert Supabase‑JWT via HS256 mit `SUPABASE_JWT_SECRET` und stellt MCP‑Access/Refresh Tokens aus (aud/resource laut Konfiguration).
- Mehrfach‑Resource (aud/resource) im Guard:
  - Setze mehrere erlaubte Resources per `OAUTH_ALLOWED_RESOURCES="https://a/mcp,https://b/mcp"` oder über Komma/Leerzeichen in `OAUTH_MODULE_OPTIONS.resource`.
  - Der Guard akzeptiert Tokens, deren aud UND resource in der Allowlist enthalten sind.

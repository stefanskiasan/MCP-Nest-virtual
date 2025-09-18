# advisori_mcp_server (7 Zeilen)

Zweck: Stammdaten zu (Remote/Virtuellen) MCP‑Servern inkl. Fähigkeiten/Konfiguration.

## Schema
- id: uuid NOT NULL DEFAULT gen_random_uuid() (PK)
- createdAt: timestamptz NOT NULL DEFAULT now()
- name: text NOT NULL
- description: text NULL
- configUrl: text NOT NULL
- configAuthToken: text NULL (sensitiv)
- alias_name: text NULL
- isVirtualServer: boolean NOT NULL DEFAULT false
- instructions: text NULL
- capabilities_*: diverse boolean Flags (tools/outputSchemas/transport/auth)
- protocolVersion: text NOT NULL DEFAULT '2025-06-18'
- serverInfoVersion: text NOT NULL DEFAULT '2.0.0-remote-compliant'
- connector_timeout_ms: integer NULL
- connector_max_retries: integer NULL
- enabled: boolean NOT NULL DEFAULT true
- server_type: text NOT NULL DEFAULT 'virtual'
- updatedAt: timestamptz NOT NULL DEFAULT now()

## Indizes/Constraints
- PRIMARY KEY (id)
- INDEX (alias_name)

## Beispiel (Auszug)
```json
[
  {
    "id": "67aa7ca9-bb66-464b-8c8c-a9018aa25c17",
    "name": "d-365",
    "enabled": true,
    "configUrl": "https://apinuclio.ai-core.dev.azcld.advisori.de/mcpserver",
    "protocolVersion": "2025-06-18",
    "serverInfoVersion": "2.0.0-remote-compliant"
  },
  {
    "id": "316abecb-eac2-47b2-b72e-7c94d4d1dfb4",
    "name": "Outlook MCP Server",
    "alias_name": "outlook-mcp-server",
    "capabilities": { "oauth21": true, "resourceIndicators": true, "explicitAudience": true, "streamable": true, "sse": true, "chunked": true }
  },
  {
    "id": "48046063-5bfc-432e-a410-980856028ac4",
    "name": "Outlook MCP Server (PKCE Demo)",
    "alias_name": "outlook-mcpserver-pkce",
    "capabilities": { "oauth21": true, "streamable": true, "sse": true, "chunked": true }
  }
]
```


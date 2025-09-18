# advisori_mcp_tool_config (62 Zeilen)

Zweck: Tool‑Definitionen je MCP‑Server inkl. Alias, Input‑Schema und Flags.

## Schema
- id: uuid NOT NULL DEFAULT gen_random_uuid() (PK)
- createdAt: timestamptz NOT NULL DEFAULT now()
- mcpServerId: uuid NOT NULL (FK → advisori_mcp_server.id)
- description: text NULL
- toolKey: text NULL
- alias_name: text NULL
- inputSchema: jsonb NULL (validiertes JSON‑Schema)
- isVirtualTool: boolean NOT NULL DEFAULT false
- isprivileged: boolean NOT NULL DEFAULT false
- category: text NULL

## Constraints/Indizes
- PRIMARY KEY (id)
- CHECK (inputSchema ist Objekt, falls gesetzt)

## Beispiel‑Tools (Auszug)
```json
[
  {
    "toolKey": "list_emails", "alias": "Outlook: List Emails", "isVirtualTool": true,
    "inputSchema": {"type":"object","properties":{"limit":{"type":"integer","default":20},"folder":{"enum":["inbox","sent","archive","drafts"]},"onlyUnread":{"type":"boolean","default":true}}}
  },
  {
    "toolKey": "send_email", "alias": "Outlook: Send Email", "isVirtualTool": true,
    "inputSchema": {"type":"object","required":["to","subject","body"]}
  },
  {
    "toolKey": "create_event", "alias": "Outlook: Create Event", "isVirtualTool": true,
    "inputSchema": {"type":"object","required":["title","start","end"]}
  },
  {
    "toolKey": "search_redis_products", "description": "ProductsV2 Master Data (Beschreibung aktuell abgeschnitten)"
  },
  {
    "toolKey": "search_redis_pricecustomergroups", "description": "PriceCustomerGroups (Beschreibung aktuell abgeschnitten)"
  },
  {
    "toolKey": "search_redis_salesprospects", "description": "SalesProspects mit Guidance (CustomerAccount‑Verknüpfung)"
  }
]
```


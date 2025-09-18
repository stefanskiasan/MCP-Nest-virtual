# advisori_mcp_tool_connector_map (14 Zeilen)

Zweck: Verknüpft Tools mit konkreten Konnektoren (HTTP/Graph/OData/SOAP/Redis/SFTP/SMTP …).

## Schema
- tool_id: uuid NOT NULL (PK, FK → advisori_mcp_tool_config.id)
- connector_id: uuid NOT NULL (FK → connectors‑Tabelle/Registry)
- enabled: boolean NOT NULL DEFAULT true
- created_at: timestamptz NOT NULL DEFAULT now()
- updated_at: timestamptz NOT NULL DEFAULT now()

## Indizes/Constraints
- PRIMARY KEY (tool_id)
- FOREIGN KEY (tool_id) → advisori_mcp_tool_config(id)
- FOREIGN KEY (connector_id) → <externe Connector‑Tabelle>

## Beispieldaten (Auszug)
```json
[
  { "tool_id": "5b8001cb-…", "connector_id": "e614ba68-…", "enabled": true },
  { "tool_id": "c1bf7d87-…", "connector_id": "e614ba68-…", "enabled": true },
  { "tool_id": "a0480ca7-…", "connector_id": "81ea7e2b-…", "enabled": true }
]
```


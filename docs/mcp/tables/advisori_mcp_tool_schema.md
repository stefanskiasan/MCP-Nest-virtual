# advisori_mcp_tool_schema (0 Zeilen)

Zweck: (Optionale) Auslagerung/Überschreibung von `inputSchema` je Tool in separate Tabelle.

## Schema
- tool_id: uuid NOT NULL (PK, FK → advisori_mcp_tool_config.id)
- inputSchema: jsonb NOT NULL
- created_at: timestamptz NOT NULL DEFAULT now()
- updated_at: timestamptz NOT NULL DEFAULT now()

## Indizes/Constraints
- PRIMARY KEY (tool_id)
- FOREIGN KEY (tool_id) → advisori_mcp_tool_config(id)


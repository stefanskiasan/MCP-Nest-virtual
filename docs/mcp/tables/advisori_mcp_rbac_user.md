# advisori_mcp_rbac_user (0 Zeilen)

Zweck: RBAC‑Zuweisungen pro MCP‑Server (Benutzername/Rolle).

## Schema
- id: uuid NOT NULL DEFAULT gen_random_uuid() (PK)
- server_id: uuid NOT NULL (FK → advisori_mcp_server.id)
- username: text NOT NULL
- role: text NOT NULL (CHECK: gültige Rollen)
- created_at: timestamptz NOT NULL DEFAULT now()
- updated_at: timestamptz NOT NULL DEFAULT now()

## Indizes/Constraints
- PRIMARY KEY (id)
- UNIQUE (server_id, username)
- FOREIGN KEY (server_id) → advisori_mcp_server(id)


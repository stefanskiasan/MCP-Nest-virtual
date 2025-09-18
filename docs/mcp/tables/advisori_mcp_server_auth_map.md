# advisori_mcp_server_auth_map (2 Zeilen)

Zweck: Verknüpft MCP‑Server mit Auth‑Profilen und steuert Aktivierung.

## Schema
- server_id: uuid NOT NULL (PK, FK → advisori_mcp_server.id)
- auth_profile_id: uuid NOT NULL (FK → advisori_mcp_auth_profile.id)
- enabled: boolean NOT NULL DEFAULT true
- createdAt: timestamptz NOT NULL DEFAULT now()
- updatedAt: timestamptz NOT NULL DEFAULT now()

## Indizes/Constraints
- PRIMARY KEY (server_id)
- FOREIGN KEY (server_id) → advisori_mcp_server(id)
- FOREIGN KEY (auth_profile_id) → advisori_mcp_auth_profile(id)

## Beispieldaten
```json
[
  { "server_id": "316abecb-eac2-47b2-b72e-7c94d4d1dfb4", "auth_profile_id": "5ffff7a8-da8f-40d8-95f8-f3a540a06eff", "enabled": true },
  { "server_id": "48046063-5bfc-432e-a410-980856028ac4", "auth_profile_id": "965c8c67-93f3-4c5c-a382-a6ee1cc2ec14", "enabled": true }
]
```


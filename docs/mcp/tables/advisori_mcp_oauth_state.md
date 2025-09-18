# advisori_mcp_oauth_state (0 Zeilen)

Zweck: Temporärer PKCE-/OAuth‑Zustand (state, code_verifier) pro Server/Auth‑Profil während des Authorization‑Flows.

## Schema
- state: text NOT NULL (PK)
- code_verifier: text NOT NULL
- server_id: uuid NOT NULL (FK → advisori_mcp_server.id)
- auth_profile_id: uuid NOT NULL (FK → advisori_mcp_auth_profile.id)
- redirect_uri: text NOT NULL
- created_at: timestamptz NOT NULL DEFAULT now()
- expires_at: timestamptz NOT NULL

## Indizes/Constraints
- PRIMARY KEY (state)
- FOREIGN KEY (server_id) → advisori_mcp_server(id)
- FOREIGN KEY (auth_profile_id) → advisori_mcp_auth_profile(id)

Beispieldaten: Aus Sicherheitsgründen nicht dargestellt.


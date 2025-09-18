# advisori_mcp_auth_token_cache (0 Zeilen)

Zweck: Token‑Zwischenspeicher pro Auth‑Profil (Access/Refresh/ID‑Token, Ablauf).

## Schema
- auth_profile_id: uuid NOT NULL (PK, FK → advisori_mcp_auth_profile.id)
- access_token: text NULL (sensitiv)
- token_type: text NULL DEFAULT 'Bearer'
- refresh_token: text NULL (sensitiv)
- expires_at: timestamptz NULL
- last_error: text NULL
- createdAt: timestamptz NOT NULL DEFAULT now()
- updatedAt: timestamptz NOT NULL DEFAULT now()
- principal: text NULL
- id_token: text NULL (sensitiv)

## Constraints
- PRIMARY KEY (auth_profile_id)
- FOREIGN KEY (auth_profile_id) → advisori_mcp_auth_profile(id)

## Indizes
- advisori_mcp_auth_token_cache_pkey (btree auth_profile_id)

Beispieldaten: Aus Sicherheitsgründen nicht dargestellt.


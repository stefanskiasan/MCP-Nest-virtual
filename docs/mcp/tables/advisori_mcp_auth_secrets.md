# advisori_mcp_auth_secrets (0 Zeilen)

Zweck: Verschlüsselte Geheimnisse pro Auth‑Profil (z. B. Static Token, Basic‑Passwort, OAuth Client Secret).

## Schema
- auth_profile_id: uuid NOT NULL (PK, FK → advisori_mcp_auth_profile.id)
- static_token_enc: text NULL (verschlüsselt)
- basic_password_enc: text NULL (verschlüsselt)
- oauth_client_secret_enc: text NULL (verschlüsselt)
- createdAt: timestamptz NOT NULL DEFAULT now()
- updatedAt: timestamptz NOT NULL DEFAULT now()

## Constraints
- PRIMARY KEY (auth_profile_id)
- FOREIGN KEY (auth_profile_id) → advisori_mcp_auth_profile(id)

## Indizes
- advisori_mcp_auth_secrets_pkey (btree auth_profile_id)

Beispieldaten: Aus Sicherheitsgründen nicht dargestellt.


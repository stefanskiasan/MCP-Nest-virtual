# advisori_mcp_auth_profile (2 Zeilen)

Zweck: Definition von Authentifizierungsprofilen (OAuth2, Basic, Static Token) für MCP‑Server/Tools.

## Schema
- id: uuid NOT NULL DEFAULT gen_random_uuid()
- createdAt: timestamptz NOT NULL DEFAULT now()
- updatedAt: timestamptz NOT NULL DEFAULT now()
- name: text NOT NULL (UNIQUE)
- type: text NOT NULL (CHECK: gültige Typen)
- header_name: text NULL
- token_prefix: text NULL
- static_token: text NULL
- basic_username: text NULL
- basic_password: text NULL
- oauth_token_url: text NULL
- oauth_auth_url: text NULL
- oauth_client_id: text NULL
- oauth_client_secret: text NULL
- oauth_scope: text NULL
- oauth_resource: text NULL
- oauth_audience: text NULL
- oauth_use_resource_indicators: boolean DEFAULT false
- oauth_use_explicit_audience: boolean DEFAULT false
- redirect_allowlist: text[] NULL
- oauth_token_auth_method: text DEFAULT 'client_secret_post'
- oauth_userinfo_url: text NULL
- oauth_user_claim_path: text NULL
- oauth_extra_auth_params: jsonb DEFAULT '{}'
- oauth_extra_token_params: jsonb DEFAULT '{}'

## Constraints
- PRIMARY KEY (id)
- UNIQUE (name)
- CHECKs auf `type` und Not‑Nulls (systemgeneriert)

## Indizes
- advisori_mcp_auth_profile_pkey (btree id)
- advisori_mcp_auth_profile_name_key (btree name)

## Beispieldaten (maskiert)
```json
[
  {
    "id": "5ffff7a8-da8f-40d8-95f8-f3a540a06eff",
    "createdAt": "2025-09-15T23:23:10Z",
    "name": "Outlook OAuth2 CC",
    "type": "OAUTH2_CLIENT_CREDENTIALS",
    "header_name": "Authorization",
    "token_prefix": "Bearer",
    "oauth_token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    "oauth_client_id": "YOUR_CLIENT_ID",
    "oauth_client_secret": "***",
    "oauth_scope": "https://graph.microsoft.com/.default"
  },
  {
    "id": "965c8c67-93f3-4c5c-a382-a6ee1cc2ec14",
    "createdAt": "2025-09-16T00:12:02Z",
    "name": "Outlook OAuth2 PKCE",
    "type": "OAUTH2_AUTH_CODE_PKCE",
    "header_name": "Authorization",
    "token_prefix": "Bearer",
    "oauth_token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    "oauth_auth_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    "oauth_client_id": "YOUR_CLIENT_ID",
    "oauth_scope": "openid profile offline_access Mail.Read Calendars.Read Contacts.Read"
  }
]
```


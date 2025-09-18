# Advisori MCP – Datenbankdokumentation (Schema + Inhalte)

Stand: 2025‑09‑18

Diese Dokumentation beschreibt die MCP‑bezogenen Tabellen im Schema `public` der PostgreSQL‑Datenbank. Sie umfasst:
- Zweck der Tabellen und Beziehungen
- Spalten (Typ, Nullable, Default)
- Constraints und Indizes
- Zeilenanzahl je Tabelle
- Maskierte Beispieldaten (falls verfügbar)

Sicherheits-Hinweis
- Geheimnisse/Token werden konsequent maskiert (***). Tabellen mit sensitiven Inhalten enthalten nur Metadaten und keine Rohwerte.

## Inhaltsverzeichnis
- [ERD & Relationen](erd.md)
- Tabellen (Details je Tabelle):
  - [advisori_mcp_auth_profile](tables/advisori_mcp_auth_profile.md)
  - [advisori_mcp_auth_secrets](tables/advisori_mcp_auth_secrets.md)
  - [advisori_mcp_auth_token_cache](tables/advisori_mcp_auth_token_cache.md)
  - [advisori_mcp_health_report](tables/advisori_mcp_health_report.md)
  - [advisori_mcp_oauth_state](tables/advisori_mcp_oauth_state.md)
  - [advisori_mcp_property_config](tables/advisori_mcp_property_config.md)
  - [advisori_mcp_rbac_user](tables/advisori_mcp_rbac_user.md)
  - [advisori_mcp_server](tables/advisori_mcp_server.md)
  - [advisori_mcp_server_auth_map](tables/advisori_mcp_server_auth_map.md)
  - [advisori_mcp_tool_config](tables/advisori_mcp_tool_config.md)
  - [advisori_mcp_tool_connector_map](tables/advisori_mcp_tool_connector_map.md)
  - [advisori_mcp_tool_schema](tables/advisori_mcp_tool_schema.md)
  - [advisori_mcp_tool_transform](tables/advisori_mcp_tool_transform.md)
- Health Reports (Zusammenfassung): [health/README.md](health/README.md)

## Zeilenanzahl (Snapshot)
- advisori_mcp_auth_profile: 2
- advisori_mcp_auth_secrets: 0
- advisori_mcp_auth_token_cache: 0
- advisori_mcp_health_report: 13
- advisori_mcp_oauth_state: 0
- advisori_mcp_property_config: 182
- advisori_mcp_rbac_user: 0
- advisori_mcp_server: 7
- advisori_mcp_server_auth_map: 2
- advisori_mcp_tool_config: 62
- advisori_mcp_tool_connector_map: 14
- advisori_mcp_tool_schema: 0
- advisori_mcp_tool_transform: 32

## Hinweise zur Nutzung
- Primärschlüssel und Fremdschlüssel sind in den Einzelseiten dokumentiert und im [ERD](erd.md) visualisiert.
- Für sensible Tabellen (Auth‑Secrets, Token‑Cache, OAuth‑State) sind Beispiele absichtlich weggelassen.


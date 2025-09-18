# ERD & Relationen (Advisori MCP)

```mermaid
erDiagram
    ADVISORI_MCP_SERVER ||--o{ ADVISORI_MCP_TOOL_CONFIG : "mcpServerId"
    ADVISORI_MCP_SERVER ||--o{ ADVISORI_MCP_HEALTH_REPORT : "server_id"
    ADVISORI_MCP_SERVER ||--o{ ADVISORI_MCP_SERVER_AUTH_MAP : "server_id"
    ADVISORI_MCP_SERVER ||--o{ ADVISORI_MCP_RBAC_USER : "server_id"
    ADVISORI_MCP_AUTH_PROFILE ||--o{ ADVISORI_MCP_SERVER_AUTH_MAP : "auth_profile_id"
    ADVISORI_MCP_AUTH_PROFILE ||--o{ ADVISORI_MCP_AUTH_SECRETS : "auth_profile_id"
    ADVISORI_MCP_AUTH_PROFILE ||--o{ ADVISORI_MCP_AUTH_TOKEN_CACHE : "auth_profile_id"
    ADVISORI_MCP_AUTH_PROFILE ||--o{ ADVISORI_MCP_OAUTH_STATE : "auth_profile_id"
    ADVISORI_MCP_SERVER ||--o{ ADVISORI_MCP_OAUTH_STATE : "server_id"
    ADVISORI_MCP_TOOL_CONFIG ||--o{ ADVISORI_MCP_TOOL_CONNECTOR_MAP : "tool_id"
    ADVISORI_MCP_TOOL_CONFIG ||--o{ ADVISORI_MCP_TOOL_TRANSFORM : "tool_id"
    ADVISORI_MCP_TOOL_CONFIG ||--o{ ADVISORI_MCP_TOOL_SCHEMA : "tool_id"
```

## Schlüsselbeziehungen (Kurzbeschreibung)
- advisori_mcp_server.id → health_report.server_id, server_auth_map.server_id, rbac_user.server_id, oauth_state.server_id, tool_config.mcpServerId
- advisori_mcp_auth_profile.id → server_auth_map.auth_profile_id, auth_secrets.auth_profile_id, auth_token_cache.auth_profile_id, oauth_state.auth_profile_id
- advisori_mcp_tool_config.id → tool_connector_map.tool_id, tool_transform.tool_id, tool_schema.tool_id

## Kardinalitäten
- Server zu Tools/Health/RBAC/AuthMap: 1 : N
- AuthProfile zu Secrets/TokenCache/OAuthState/AuthMap: 1 : N
- ToolConfig zu ConnectorMap/Transform/Schema: 1 : N


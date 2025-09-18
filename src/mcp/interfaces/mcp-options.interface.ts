import { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import { CanActivate, ModuleMetadata, Type } from '@nestjs/common';

export enum McpTransportType {
  SSE = 'sse',
  STREAMABLE_HTTP = 'streamable-http',
  STDIO = 'stdio',
}

export interface McpOptions {
  // When and if, additional properties are introduced in ServerOptions or ServerInfo,
  // consider deprecating these fields in favor of using ServerOptions and ServerInfo directly.
  name: string;
  version: string;
  capabilities?: ServerCapabilities;
  instructions?: string;

  transport?: McpTransportType | McpTransportType[];
  sseEndpoint?: string;
  messagesEndpoint?: string;
  mcpEndpoint?: string;
  /**
   * @deprecated Use `app.setGlobalPrefix()` for global api prefix. Use apiPrefix to attach a prefix to the handshake.
   */
  globalApiPrefix?: never;
  apiPrefix?: string;
  guards?: Type<CanActivate>[];
  decorators?: ClassDecorator[];
  sse?: {
    pingEnabled?: boolean;
    pingIntervalMs?: number;
  };
  streamableHttp?: {
    enableJsonResponse?: boolean;
    sessionIdGenerator?: () => string;
    /**
     * @experimental: The current implementation does not fully comply with the MCP Specification.
     */
    statelessMode?: boolean;
  };
  /**
   * Optional Supabase-backed configuration for virtual MCP servers and tools.
   * If enabled and a server id is supplied per request, initialize and tools/list
   * will derive their data from Supabase tables instead of only discovered tools.
   */
  supabase?: {
    enabled?: boolean;
    /** Supabase project URL, e.g. https://xyzcompany.supabase.co */
    url?: string;
    /** Public anon key or service key for PostgREST calls. Falls back to env SUPABASE_ANON_KEY/SUPABASE_SERVICE_KEY */
    anonKey?: string;
    serviceKey?: string;
    /** Database schema (default: 'public') */
    schema?: string;
    tables?: {
      server?: string; // default: 'advisori_mcp_server'
      toolConfig?: string; // default: 'advisori_mcp_tool_config'
      toolConnectorMap?: string; // default: 'advisori_mcp_tool_connector_map'
      toolTransform?: string; // default: 'advisori_mcp_tool_transform'
      connectorService?: string; // default: 'advisori_connector_service'
      connectorAuthMap?: string; // optional, if auth headers are used
    };
    connectorHttp?: {
      timeoutMs?: number; // default 15000
      retry?: { attempts?: number; backoffMs?: number }; // default 1 / 0ms
      allowlistHosts?: string[]; // optional allowlist for base_url hostnames
    };
    /** Header and query param names to read the MCP server id from the request */
    serverIdHeader?: string; // default: 'mcp-server-id'
    serverIdQueryParam?: string; // default: 'mcpServerId'
  };
}

// Async variant omits transport since controllers are not auto-registered in forRootAsync
export type McpAsyncOptions = Omit<McpOptions, 'transport'>;

export interface McpOptionsFactory {
  createMcpOptions(): Promise<McpAsyncOptions> | McpAsyncOptions;
}

export interface McpModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<McpOptionsFactory>;
  useClass?: Type<McpOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<McpAsyncOptions> | McpAsyncOptions;
  inject?: any[];
  extraProviders?: any[]; // allow user to provide additional providers in async mode
}

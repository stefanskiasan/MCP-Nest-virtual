import { Inject, Injectable, Logger } from '@nestjs/common';
import { McpOptions } from '../interfaces';

type ServerRow = {
  id: string;
  name?: string;
  alias_name?: string;
  description?: string | null;
  instructions?: string | null;
  protocolVersion?: string | null;
  serverInfoVersion?: string | null;
  capabilities?: Record<string, any> | null;
  enabled?: boolean;
};

type ToolRow = {
  id: string;
  mcpServerId: string;
  toolKey?: string | null;
  alias_name?: string | null;
  description?: string | null;
  inputSchema?: any | null;
  isVirtualTool?: boolean;
};

@Injectable()
export class McpSupabaseConfigService {
  private readonly logger = new Logger(McpSupabaseConfigService.name);

  constructor(@Inject('MCP_OPTIONS') private readonly options: McpOptions) {}

  private get supabaseEnabled(): boolean {
    return !!this.options.supabase?.enabled;
  }

  private get supabaseUrl(): string | undefined {
    return (
      this.options.supabase?.url || process.env.SUPABASE_URL || undefined
    );
  }

  private get supabaseKey(): string | undefined {
    return (
      this.options.supabase?.serviceKey ||
      process.env.SUPABASE_SERVICE_KEY ||
      this.options.supabase?.anonKey ||
      process.env.SUPABASE_ANON_KEY ||
      undefined
    );
  }

  private get schema(): string {
    return this.options.supabase?.schema || 'public';
  }

  private get serverTable(): string {
    return (
      this.options.supabase?.tables?.server || 'advisori_mcp_server'
    );
  }

  private get toolTable(): string {
    return (
      this.options.supabase?.tables?.toolConfig || 'advisori_mcp_tool_config'
    );
  }

  private get toolConnectorMapTable(): string {
    return (
      this.options.supabase?.tables?.toolConnectorMap || 'advisori_mcp_tool_connector_map'
    );
  }

  private get toolTransformTable(): string {
    return (
      this.options.supabase?.tables?.toolTransform || 'advisori_mcp_tool_transform'
    );
  }

  private get connectorServiceTable(): string {
    return (
      this.options.supabase?.tables?.connectorService || 'advisori_connector_service'
    );
  }

  getServerIdFromRequest(req: { headers: Record<string, any>; query: any; params?: Record<string, any> }): string | undefined {
    if (!req) return undefined;
    const headerName = this.options.supabase?.serverIdHeader || 'mcp-server-id';
    const queryName = this.options.supabase?.serverIdQueryParam || 'mcpServerId';
    const headerVal = (req.headers?.[headerName] || req.headers?.[headerName.toLowerCase()]) as string | undefined;
    const queryVal = (req.query?.[queryName]) as string | undefined;
    const paramVal = (req.params?.[queryName] || req.params?.['mcpServerId']) as string | undefined;
    return (headerVal || paramVal || queryVal)?.toString();
  }

  private ensureConfigReady(): void {
    if (!this.supabaseEnabled) return;
    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Supabase mode enabled but SUPABASE_URL or key is missing');
    }
  }

  private async rest<T = any>(path: string, params?: Record<string, string>): Promise<T> {
    this.ensureConfigReady();
    const url = new URL(`${this.supabaseUrl}/rest/v1/${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    const fetchFn: any = (globalThis as any).fetch;
    if (!fetchFn) {
      throw new Error('global fetch is not available in this runtime');
    }
    const res = await fetchFn(url.toString(), {
      method: 'GET',
      headers: {
        apikey: this.supabaseKey!,
        Authorization: `Bearer ${this.supabaseKey}`,
        Accept: 'application/json',
        'Accept-Profile': this.schema,
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Supabase REST error ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }

  async fetchServerById(id: string): Promise<ServerRow | undefined> {
    if (!this.supabaseEnabled) return undefined;
    const rows = await this.rest<ServerRow[]>(`${this.serverTable}`, {
      select: '*',
      id: `eq.${id}`,
      limit: '1',
    });
    return rows?.[0];
  }

  async fetchToolsByServerId(serverId: string): Promise<ToolRow[]> {
    if (!this.supabaseEnabled) return [];
    const rows = await this.rest<ToolRow[]>(`${this.toolTable}`, {
      select: '*',
      mcpServerId: `eq.${serverId}`,
      order: 'createdAt.asc',
    });
    return rows || [];
  }

  async fetchToolByName(serverId: string, name: string): Promise<ToolRow | undefined> {
    if (!this.supabaseEnabled) return undefined;
    const rows = await this.rest<ToolRow[]>(`${this.toolTable}`, {
      select: 'id,mcpServerId,toolKey,alias_name,description,inputSchema',
      mcpServerId: `eq.${serverId}`,
      toolKey: `eq.${name}`,
      limit: '1',
    });
    return rows?.[0];
  }

  async fetchConnectorMapping(toolId: string): Promise<{ connector_id: string; enabled: boolean } | undefined> {
    if (!this.supabaseEnabled) return undefined;
    const rows = await this.rest<any[]>(`${this.toolConnectorMapTable}`, {
      select: 'connector_id,enabled',
      tool_id: `eq.${toolId}`,
      limit: '1',
    });
    return rows?.[0];
  }

  async fetchConnectorService(connectorId: string): Promise<{ id: string; base_url: string; type?: string; enabled?: boolean } | undefined> {
    if (!this.supabaseEnabled) return undefined;
    const rows = await this.rest<any[]>(`${this.connectorServiceTable}`, {
      select: 'id,base_url,type,enabled',
      id: `eq.${connectorId}`,
      limit: '1',
    });
    return rows?.[0];
  }

  async fetchActiveTransform(toolId: string, direction: 'request' | 'response'): Promise<string | undefined> {
    if (!this.supabaseEnabled) return undefined;
    const rows = await this.rest<any[]>(`${this.toolTransformTable}`, {
      select: 'code,is_active',
      tool_id: `eq.${toolId}`,
      direction: `eq.${direction}`,
      is_active: 'eq.true',
      limit: '1',
    });
    const row = rows?.[0];
    return row?.code as string | undefined;
  }

  /**
   * Convert DB capabilities into MCP ServerCapabilities-like flags where relevant.
   * Unknown keys are ignored gracefully.
   */
  buildServerCapabilities(db: ServerRow | undefined): Record<string, any> {
    if (!db) return {};
    const caps = (db.capabilities || {}) as Record<string, any>;
    const out: Record<string, any> = {};
    // We only map the MCP capabilities we understand here; others are ignored.
    // Always allow tools list when in virtual mode; client will call tools/list.
    out.tools = { listChanged: true };
    // For resources/prompts you could map future flags similarly
    return out;
  }
}

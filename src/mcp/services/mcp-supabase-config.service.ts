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

  // --- Secret & Consent helpers ---
  async fetchSecretValueById(secretId: string): Promise<string | null> {
    if (!this.supabaseEnabled || !secretId) return null;
    const rows = await this.rest<any[]>(`advisori_secretmanager`, {
      select: 'id,value',
      id: `eq.${secretId}`,
      limit: '1',
    });
    const row = rows?.[0];
    return (row && (row.value as string)) || null;
  }

  async fetchSecretValuesByIds(ids: string[]): Promise<Record<string, string | null>> {
    const out: Record<string, string | null> = {};
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (!this.supabaseEnabled || unique.length === 0) return out;
    const params: Record<string, string> = {
      select: 'id,value',
      id: `in.(${unique.join(',')})`,
    };
    const rows = await this.rest<any[]>(`advisori_secretmanager`, params);
    for (const id of unique) out[id] = null;
    for (const r of rows || []) out[r.id] = r.value ?? null;
    return out;
  }

  async fetchUserSecretBindings(
    userId: string,
    serverId?: string,
    connectorId?: string,
  ): Promise<Array<{ id: string; user_id: string; server_id: string | null; connector_id: string | null; ref_kind: string; ref_key: string; secret_id: string; active: boolean }>> {
    if (!this.supabaseEnabled) return [];
    const eq = (k: string, v: string | undefined) => (v ? { [k]: `eq.${v}` } : {});
    const rows = await this.rest<any[]>(`advisori_mcp_user_secret_binding`, {
      select: 'id,user_id,server_id,connector_id,ref_kind,ref_key,secret_id,active',
      ...eq('user_id', userId),
      ...eq('server_id', serverId),
      ...eq('connector_id', connectorId),
      active: 'eq.true',
      order: 'updated_at.desc',
    });
    return rows || [];
  }

  async listRequiredSecretRefs(
    serverId?: string,
    connectorId?: string,
  ): Promise<Array<{ id: string; ref_kind: string; ref_key: string; required: boolean; managed_by?: string; allow_override?: boolean; admin_secret_id?: string | null; ui_label?: string | null; ui_hint?: string | null }>> {
    if (!this.supabaseEnabled) return [];
    const params: Record<string, string> = { select: 'id,ref_kind,ref_key,required,managed_by,allow_override,admin_secret_id,ui_label,ui_hint' };
    if (serverId) params['server_id'] = `eq.${serverId}`;
    if (connectorId) params['connector_id'] = `eq.${connectorId}`;
    const rows = await this.rest<any[]>(`advisori_mcp_required_secret_ref`, params).catch(() => []);
    return rows || [];
  }

  async listRequiredSecretRefsForTool(
    toolId: string,
    connectorId?: string,
  ): Promise<Array<{ id: string; ref_kind: string; ref_key: string; required: boolean; managed_by?: string; allow_override?: boolean; admin_secret_id?: string | null; ui_label?: string | null; ui_hint?: string | null }>> {
    if (!this.supabaseEnabled) return [];
    const paramsTool: Record<string, string> = { select: 'id,ref_kind,ref_key,required,managed_by,allow_override,admin_secret_id,ui_label,ui_hint', tool_id: `eq.${toolId}` };
    const toolRefs = await this.rest<any[]>(`advisori_mcp_required_secret_ref`, paramsTool).catch(() => []);
    if (!connectorId) return toolRefs || [];
    const paramsConn: Record<string, string> = { select: 'id,ref_kind,ref_key,required,managed_by,allow_override,admin_secret_id,ui_label,ui_hint', connector_id: `eq.${connectorId}` };
    const connRefs = await this.rest<any[]>(`advisori_mcp_required_secret_ref`, paramsConn).catch(() => []);
    return [ ...(toolRefs || []), ...(connRefs || []) ];
  }

  private async restMutate<T = any>(path: string, body: any, method: 'POST' | 'PATCH'): Promise<T> {
    this.ensureConfigReady();
    const url = new URL(`${this.supabaseUrl}/rest/v1/${path}`);
    const fetchFn: any = (globalThis as any).fetch;
    if (!fetchFn) throw new Error('global fetch is not available in this runtime');
    const res = await fetchFn(url.toString(), {
      method,
      headers: {
        apikey: this.supabaseKey!,
        Authorization: `Bearer ${this.supabaseKey}`,
        Accept: 'application/json',
        'Accept-Profile': this.schema,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Supabase REST mutate error ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }

  async ensureSecret(value: string, name?: string, owner_user_id?: string): Promise<string> {
    const rows = await this.restMutate<any[]>(`advisori_secretmanager`, [{ value, ...(name ? { name } : {}), ...(owner_user_id ? { owner_user_id } : {}) }], 'POST');
    const row = rows?.[0];
    if (!row?.id) throw new Error('Failed to insert secret');
    return row.id as string;
  }

  async upsertUserBinding(payload: { user_id: string; server_id?: string | null; connector_id?: string | null; ref_kind: string; ref_key: string; secret_id: string; active?: boolean }): Promise<void> {
    const urlPath = `advisori_mcp_user_secret_binding?on_conflict=user_id,server_id,connector_id,ref_kind,ref_key`;
    await this.restMutate<any[]>(urlPath, [
      {
        user_id: payload.user_id,
        server_id: payload.server_id ?? null,
        connector_id: payload.connector_id ?? null,
        ref_kind: payload.ref_kind,
        ref_key: payload.ref_key,
        secret_id: payload.secret_id,
        active: payload.active ?? true,
        updated_at: new Date().toISOString(),
      },
    ], 'POST');
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

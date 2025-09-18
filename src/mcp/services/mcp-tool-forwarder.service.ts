import { Inject, Injectable, Logger } from '@nestjs/common';
import { McpOptions } from '../interfaces';
import { McpSupabaseConfigService } from './mcp-supabase-config.service';
import { HttpRequest } from '../interfaces/http-adapter.interface';

@Injectable()
export class McpToolForwarderService {
  private readonly logger = new Logger(McpToolForwarderService.name);
  constructor(
    @Inject('MCP_OPTIONS') private readonly options: McpOptions,
    private readonly supa: McpSupabaseConfigService,
  ) {}

  private pickForwardableHeaders(req: HttpRequest): Record<string, string> {
    const out: Record<string, string> = {};
    const src = req.headers || {};
    for (const [k, v] of Object.entries(src)) {
      if (!k) continue;
      const key = k.toLowerCase();
      // Forward selected headers only
      if (key.startsWith('x-') || key === 'authorization' || key === 'cookie') {
        const vv = Array.isArray(v) ? v[0] : v;
        if (typeof vv === 'string') out[k] = vv;
      }
    }
    return out;
  }

  private ensureAllowedUrl(urlStr: string) {
    try {
      const u = new URL(urlStr);
      const allow = this.options.supabase?.connectorHttp?.allowlistHosts;
      if (Array.isArray(allow) && allow.length > 0) {
        if (!allow.includes(u.hostname)) {
          throw new Error(`Connector host not allowlisted: ${u.hostname}`);
        }
      }
    } catch (e) {
      throw new Error(`Invalid connector base_url: ${urlStr}`);
    }
  }

  private async postJson(url: string, body: any): Promise<any> {
    const timeoutMs = this.options.supabase?.connectorHttp?.timeoutMs ?? 15000;
    const attempts = this.options.supabase?.connectorHttp?.retry?.attempts ?? 1;
    const backoffMs = this.options.supabase?.connectorHttp?.retry?.backoffMs ?? 0;

    const fetchFn: any = (globalThis as any).fetch;
    if (!fetchFn) throw new Error('global fetch is not available');

    let lastErr: any;
    for (let i = 0; i < attempts; i++) {
      try {
        const ctrl = new AbortController();
        const id = setTimeout(() => ctrl.abort(), timeoutMs);
        const res = await fetchFn(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
        clearTimeout(id);
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Connector HTTP ${res.status}: ${text}`);
        }
        return await res.json();
      } catch (e) {
        lastErr = e;
        if (i < attempts - 1 && backoffMs > 0) await new Promise(r => setTimeout(r, backoffMs));
      }
    }
    throw lastErr || new Error('Connector request failed');
  }

  async forward(
    serverId: string,
    toolName: string,
    args: any,
    httpRequest: HttpRequest,
  ): Promise<any> {
    // 1) Find tool
    const tool = await this.supa.fetchToolByName(serverId, toolName);
    if (!tool) throw new Error(`TOOL_NOT_FOUND: ${toolName}`);

    // 2) Mapping → connector
    const map = await this.supa.fetchConnectorMapping(tool.id);
    if (!map || map.enabled === false) throw new Error('CONNECTOR_NOT_MAPPED');

    const connector = await this.supa.fetchConnectorService(map.connector_id);
    if (!connector || connector.enabled === false) throw new Error('CONNECTOR_DISABLED_OR_MISSING');
    if (!connector.base_url) throw new Error('CONNECTOR_BASE_URL_MISSING');
    this.ensureAllowedUrl(connector.base_url);

    // 3) Active transforms
    const transformRequest = await this.supa.fetchActiveTransform(tool.id, 'request');
    const transformResponse = await this.supa.fetchActiveTransform(tool.id, 'response');
    if (!transformRequest) throw new Error('TRANSFORM_REQUEST_MISSING');

    // 4) Headers from request
    const customHeader = this.pickForwardableHeaders(httpRequest);

    // 5) Build forward payload
    const payload = {
      mcpToolRequest: {
        name: toolName,
        arguments: args || {},
        inputSchema: tool.inputSchema || null,
      },
      transformRequest,
      transformResponse: transformResponse || null,
      customHeader,
      mcpServerId: serverId,
    };

    // 6) POST
    const response = await this.postJson(connector.base_url, payload);
    return response;
  }
}


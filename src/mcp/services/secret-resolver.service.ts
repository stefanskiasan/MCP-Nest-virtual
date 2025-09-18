import { Inject, Injectable, Logger } from '@nestjs/common';
import { McpSupabaseConfigService } from './mcp-supabase-config.service';
import { HttpRequest } from '../interfaces/http-adapter.interface';

@Injectable()
export class SecretResolverService {
  private readonly logger = new Logger(SecretResolverService.name);

  constructor(
    private readonly supa: McpSupabaseConfigService,
    @Inject('MCP_MODULE_ID') private readonly mcpModuleId: string,
  ) {}

  private normalizeHeaders(
    headers: Record<string, any>,
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers || {})) {
      if (!k) continue;
      const val = Array.isArray(v) ? v[0] : v;
      if (typeof val === 'string') out[k] = val;
    }
    return out;
  }

  private async resolveSecretIdToValue(
    secretId: string | undefined,
  ): Promise<string | null> {
    if (!secretId) return null;
    try {
      const val = await this.supa.fetchSecretValueById(secretId);
      return val ?? null;
    } catch (e) {
      this.logger.warn(`Secret lookup failed for ${secretId}: ${e}`);
      return null;
    }
  }

  private extractDirectSecretHeaders(raw: Record<string, string>): {
    values: Record<string, string>;
    ids: Array<{ header: string; id: string }>;
  } {
    const values: Record<string, string> = {};
    const ids: Array<{ header: string; id: string }> = [];
    for (const [name, value] of Object.entries(raw)) {
      if (name.toLowerCase().startsWith('x-secret-header-')) {
        const base = name.substring('X-Secret-Header-'.length);
        values[base] = value;
        continue;
      }
      if (name.toUpperCase().endsWith('-ID')) {
        const base = name.substring(0, name.length - 3); // strip -Id
        ids.push({ header: base, id: value });
      }
    }
    return { values, ids };
  }

  private extractSecretsFromArgs(args: any): Record<string, string> {
    if (!args || typeof args !== 'object') return {};
    const secrets = args._secrets;
    if (!secrets || typeof secrets !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(secrets)) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  }

  private getUserIdFromRequest(req: HttpRequest): string | undefined {
    const raw: any = req.raw;
    const user = (raw && raw.user) || (req as any).user;
    return (user && (user.sub || user.id)) || undefined;
  }

  async resolve(
    httpRequest: HttpRequest,
    serverId: string,
    connectorId: string | undefined,
    toolId: string,
    args: any,
  ): Promise<Record<string, string>> {
    const baseHeaders = this.normalizeHeaders(httpRequest.headers as any);
    const out: Record<string, string> = {};

    // 1) Direct headers
    const { values: directVals, ids: directIds } =
      this.extractDirectSecretHeaders(baseHeaders);
    Object.assign(out, directVals);
    for (const { header, id } of directIds) {
      const val = await this.resolveSecretIdToValue(id);
      if (val) {
        if (
          header.toLowerCase() === 'authorization' &&
          !/^bearer\s/i.test(val)
        ) {
          out['Authorization'] = `Bearer ${val}`;
        } else {
          out[header] = val;
        }
      }
    }

    // 2) Args secrets
    Object.assign(out, this.extractSecretsFromArgs(args));

    // 3) User bindings
    try {
      const userId = this.getUserIdFromRequest(httpRequest);
      if (userId) {
        const bindings = await this.supa.fetchUserSecretBindings(
          userId,
          serverId,
          connectorId,
        );
        if (bindings.length) {
          const ids: string[] = bindings
            .map((b) => b.secret_id)
            .filter(Boolean);
          const values = await this.supa.fetchSecretValuesByIds(ids);
          for (const b of bindings) {
            const val = values[b.secret_id] || null;
            if (!val) continue;
            if (b.ref_kind === 'header_id') {
              out[b.ref_key] = val;
            } else {
              const hdr = `X-Secret-Ref-${b.ref_key}`;
              out[hdr] = val;
            }
          }
        }
      }
    } catch (e) {
      this.logger.warn(`User secret binding resolution failed: ${e}`);
    }

    // 4) Apply tool-level rules (managed_by/allow_override/admin_secret_id)
    try {
      const refs = await this.supa.listRequiredSecretRefsForTool(
        toolId,
        connectorId,
      );
      // Batch fetch admin secret values
      const adminIds = refs
        .map((r) => r.admin_secret_id)
        .filter((x): x is string => !!x);
      const adminValues = await this.supa.fetchSecretValuesByIds(adminIds);

      for (const r of refs) {
        const kind = (r.managed_by || 'USER').toUpperCase();
        const allowOverride = !!r.allow_override;

        // Determine header name to set
        const headerName =
          r.ref_kind === 'header_id' ? r.ref_key : `X-Secret-Ref-${r.ref_key}`;

        // Candidates
        const directVal = out[headerName] ?? directVals[r.ref_key] ?? undefined;
        let userVal: string | undefined = undefined;
        // Try user binding aftermath (we already filled out with header names)
        if (headerName in out) userVal = out[headerName];

        const adminVal = r.admin_secret_id
          ? (adminValues[r.admin_secret_id] ?? null)
          : null;

        const choose = () => {
          if (kind === 'ADMIN') {
            if (allowOverride && (directVal || userVal))
              return directVal || userVal!;
            if (adminVal) return adminVal;
            if (r.required)
              throw new Error(`MISSING_ADMIN_SECRET:${r.ref_key}`);
            return undefined;
          }
          if (kind === 'USER') {
            if (directVal) return directVal;
            if (userVal) return userVal;
            if (r.required) throw new Error(`MISSING_USER_SECRET:${r.ref_key}`);
            return undefined;
          }
          // EITHER
          if (directVal) return directVal;
          if (userVal) return userVal;
          if (adminVal) return adminVal;
          if (r.required) throw new Error(`MISSING_SECRET:${r.ref_key}`);
          return undefined;
        };

        const chosen = choose();
        if (chosen !== undefined) {
          // Authorization convenience: add Bearer if missing
          if (
            headerName.toLowerCase() === 'authorization' &&
            !/^bearer\s/i.test(chosen)
          ) {
            out['Authorization'] = `Bearer ${chosen}`;
          } else {
            out[headerName] = chosen;
          }
        }
      }
    } catch (e) {
      this.logger.warn(`Apply managed_by rules failed: ${e}`);
      throw e; // surface to caller when required secrets missing
    }

    return out;
  }
}

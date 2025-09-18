import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { McpAuthJwtGuard } from './guards/jwt-auth.guard';
import { McpSupabaseConfigService } from '../mcp/services/mcp-supabase-config.service';
import { McpOptions } from '../mcp/interfaces';

@Controller('remote-auth/provider')
@UseGuards(McpAuthJwtGuard)
export class McpProviderConsentController {
  private readonly logger = new Logger(McpProviderConsentController.name);

  constructor(
    private readonly supa: McpSupabaseConfigService,
    @Inject('MCP_OPTIONS') private readonly options: McpOptions,
  ) {}

  @Get(':provider/begin')
  async begin(
    @Param('provider') provider: string,
    @Query('serverId') serverId?: string,
    @Query('toolId') toolId?: string,
    @Query('mode') mode?: string, // 'pkce' | 'cc' | 'api_key' | 'basic'
    @Query('returnUrl') returnUrl?: string,
    @Res() res?: Response,
  ) {
    const cat = await this.supa.fetchProviderCatalog(provider);
    const flow = mode || cat?.flow_type || 'oauth2_pkce';
    const fields: Array<any> = Array.isArray(cat?.form_schema)
      ? cat.form_schema
      : [];
    const title = `Connect Provider: ${provider}`;
    const action = `${this.routePrefix()}/remote-auth/provider/${provider}/submit`;

    const itemsHtml = fields
      .map((f) => {
        const type = f.type === 'secret' ? 'password' : 'text';
        const req = f.required ? 'required' : '';
        const hint = f.hint
          ? `<div style=\"color:#666;font-size:12px\">${f.hint}</div>`
          : '';
        return `
        <label style=\"display:block;margin:8px 0;\">\n          <span>${f.label || f.key}${f.required ? ' *' : ''}</span>\n          <input type=\"${type}\" name=\"fields[${f.key}]\" style=\"width:100%\" ${req} />\n          ${hint}\n        </label>`;
      })
      .join('');

    const html = `<!doctype html>
    <html><head><meta charset=\"utf-8\"><title>${title}</title></head>
    <body style=\"font-family:system-ui,Arial;margin:24px;max-width:640px;\">
      <h2>${title}</h2>
      <form method=\"POST\" action=\"${action}\">\n        <input type=\"hidden\" name=\"server_id\" value=\"${serverId || ''}\">\n        <input type=\"hidden\" name=\"tool_id\" value=\"${toolId || ''}\">\n        <input type=\"hidden\" name=\"provider\" value=\"${provider}\">\n        <input type=\"hidden\" name=\"mode\" value=\"${flow}\">\n        <input type=\"hidden\" name=\"returnUrl\" value=\"${returnUrl || ''}\">\n        ${itemsHtml || '<p>Keine Felder erforderlich.</p>'}\n        <button type=\"submit\" style=\"margin-top:16px\">Weiter</button>\n      </form>
    </body></html>`;
    res!.type('html').send(html);
  }

  @Get(':provider/begin.json')
  async beginJson(
    @Param('provider') provider: string,
    @Query('serverId') serverId?: string,
    @Query('toolId') toolId?: string,
    @Query('mode') mode?: string,
    @Query('returnUrl') returnUrl?: string,
    @Res() res?: Response,
  ) {
    const cat = await this.supa.fetchProviderCatalog(provider);
    if (!cat) {
      res!.status(404).json({ error: 'PROVIDER_NOT_FOUND' });
      return;
    }
    const flow = mode || cat.flow_type || 'oauth2_pkce';
    res!.json({
      provider_key: cat.provider_key,
      flow_type: flow,
      authorize_url_template: cat.authorize_url_template,
      token_url_template: cat.token_url_template,
      default_scopes: cat.default_scopes,
      form_schema: Array.isArray(cat.form_schema) ? cat.form_schema : [],
      action: `${this.routePrefix()}/remote-auth/provider/${provider}/submit.json`,
      serverId,
      toolId,
      returnUrl: returnUrl || null,
    });
  }

  @Post(':provider/submit')
  async submit(
    @Param('provider') provider: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const serverId = body.server_id || body.serverId || null;
    const toolId = body.tool_id || body.toolId || null;
    const mode = body.mode || 'oauth2_pkce';
    const fields = body.fields || {};
    const returnUrl = body.returnUrl || '/';

    // Resolve form fields
    const client_id = fields.client_id || null;
    const client_secret = fields.client_secret || null;
    const scopes = fields.scopes || null;
    const tenant = fields.tenant || null;

    // Build URLs from catalog if templates given
    const cat = await this.supa.fetchProviderCatalog(provider);
    const authUrlTpl = cat?.authorize_url_template || null;
    const tokenUrlTpl = cat?.token_url_template || null;
    const apply = (tpl: string | null): string | null => {
      if (!tpl) return null;
      let s = tpl;
      if (tenant) s = s.replace('{tenant}', tenant).replace(':tenant', tenant);
      return s;
    };

    if (toolId) {
      await this.supa.upsertAuthProfileForTool(toolId, provider, mode, {
        authorize_url: apply(authUrlTpl),
        token_url: apply(tokenUrlTpl),
        client_id,
        client_secret,
        scopes,
        header_name: 'Authorization',
        token_prefix: 'Bearer',
      });
    } else if (serverId) {
      await this.supa.upsertAuthProfileForServer(serverId, provider, mode, {
        authorize_url: apply(authUrlTpl),
        token_url: apply(tokenUrlTpl),
        client_id,
        client_secret,
        scopes,
        header_name: 'Authorization',
        token_prefix: 'Bearer',
      });
    }

    // Redirect back to app or show success
    res.redirect(303, returnUrl);
  }

  @Post(':provider/submit.json')
  async submitJson(
    @Param('provider') provider: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const serverId = body.server_id || body.serverId || null;
    const toolId = body.tool_id || body.toolId || null;
    const mode = body.mode || 'oauth2_pkce';
    const fields = body.fields || {};

    const client_id = fields.client_id || null;
    const client_secret = fields.client_secret || null;
    const scopes = fields.scopes || null;
    const tenant = fields.tenant || null;

    const cat = await this.supa.fetchProviderCatalog(provider);
    if (!cat) {
      res.status(404).json({ error: 'PROVIDER_NOT_FOUND' });
      return;
    }
    const apply = (tpl: string | null): string | null => {
      if (!tpl) return null;
      let s = tpl;
      if (tenant) s = s.replace('{tenant}', tenant).replace(':tenant', tenant);
      return s;
    };

    let profileId: string | null = null;
    if (toolId) {
      profileId = await this.supa.upsertAuthProfileForTool(
        toolId,
        provider,
        mode,
        {
          authorize_url: apply(cat.authorize_url_template || null),
          token_url: apply(cat.token_url_template || null),
          client_id,
          client_secret,
          scopes,
          header_name: 'Authorization',
          token_prefix: 'Bearer',
        },
      );
    } else if (serverId) {
      profileId = await this.supa.upsertAuthProfileForServer(
        serverId,
        provider,
        mode,
        {
          authorize_url: apply(cat.authorize_url_template || null),
          token_url: apply(cat.token_url_template || null),
          client_id,
          client_secret,
          scopes,
          header_name: 'Authorization',
          token_prefix: 'Bearer',
        },
      );
    } else {
      res
        .status(400)
        .json({ error: 'MISSING_SCOPE_TARGET (serverId or toolId)' });
      return;
    }

    res.json({ status: 'ok', provider, mode, profileId });
  }

  private routePrefix(): string {
    return this.options.apiPrefix ? `/${this.options.apiPrefix}` : '';
  }
  @Get(':provider/preview')
  async previewProvider(
    @Param('provider') provider: string,
    @Res() res: Response,
  ) {
    const cat = await this.supa.fetchProviderCatalog(provider);
    if (!cat) {
      res.status(404).json({ error: 'PROVIDER_NOT_FOUND' });
      return;
    }
    res.json({
      provider_key: cat.provider_key,
      flow_type: cat.flow_type,
      authorize_url_template: cat.authorize_url_template,
      token_url_template: cat.token_url_template,
      default_scopes: cat.default_scopes,
      headers_blueprint: cat.headers_blueprint,
      form_schema: cat.form_schema,
      active: cat.active,
    });
  }
}

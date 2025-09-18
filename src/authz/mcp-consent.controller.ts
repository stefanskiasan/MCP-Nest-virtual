import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { McpAuthJwtGuard } from './guards/jwt-auth.guard';
import { McpSupabaseConfigService } from '../mcp/services/mcp-supabase-config.service';
import { McpOptions } from '../mcp/interfaces';

@Controller('remote-auth/consent')
@UseGuards(McpAuthJwtGuard)
export class McpConsentController {
  private readonly logger = new Logger(McpConsentController.name);

  constructor(
    private readonly supa: McpSupabaseConfigService,
    @Inject('MCP_OPTIONS') private readonly options: McpOptions,
  ) {}

  @Get()
  async begin(
    @Query('serverId') serverId?: string,
    @Query('connectorId') connectorId?: string,
    @Query('returnUrl') returnUrl?: string,
    @Res() res?: Response,
  ) {
    const refs = await this.supa.listRequiredSecretRefs(serverId, connectorId);
    const title = 'Connect Secrets';
    const action = `${this.routePrefix()}/remote-auth/consent/submit`;
    const itemsHtml = refs
      .map(
        (r) => `
        <label style="display:block;margin:8px 0;">
          <span>${r.ref_key} (${r.ref_kind})${r.required ? ' *' : ''}</span>
          <input type="password" name="items[${r.ref_kind}:${r.ref_key}]" style="width:100%" ${r.required ? 'required' : ''} />
        </label>`,
      )
      .join('\n');

    const html = `<!doctype html>
    <html><head><meta charset="utf-8"><title>${title}</title></head>
    <body style="font-family:system-ui,Arial;margin:24px;max-width:640px;">
      <h2>${title}</h2>
      <form method="POST" action="${action}">
        <input type="hidden" name="server_id" value="${serverId || ''}">
        <input type="hidden" name="connector_id" value="${connectorId || ''}">
        <input type="hidden" name="returnUrl" value="${returnUrl || ''}">
        ${itemsHtml || '<p>Keine vordefinierten Felder. Du kannst trotzdem eigene Secrets speichern.</p>'}
        <button type="submit" style="margin-top:16px">Speichern</button>
      </form>
    </body></html>`;
    res!.type('html').send(html);
  }

  @Post('submit')
  async submit(@Body() body: any, @Res() res: Response) {
    const server_id = body.server_id || body.serverId || null;
    const connector_id = body.connector_id || body.connectorId || null;
    const returnUrl = body.returnUrl || '/';

    // items posted as items[ref_kind:ref_key] = value
    const items: Array<{ ref_kind: string; ref_key: string; value: string }> = [];
    const rawItems = body.items || {};
    if (typeof rawItems === 'object') {
      for (const [k, v] of Object.entries(rawItems)) {
        if (!v) continue;
        const [ref_kind, ref_key] = String(k).split(':');
        if (ref_kind && ref_key) items.push({ ref_kind, ref_key, value: String(v) });
      }
    }

    // We need the current user id; in this protected route we can read res.req.user
    const reqUser: any = (res as any).req?.user || (res as any).req?.raw?.user;
    const user_id: string = reqUser?.sub || reqUser?.id;
    if (!user_id) {
      res.status(401).json({ error: 'UNAUTHENTICATED' });
      return;
    }

    // store secrets and bindings
    for (const it of items) {
      const secretId = await this.supa.ensureSecret(it.value, undefined, user_id);
      await this.supa.upsertUserBinding({
        user_id,
        server_id,
        connector_id,
        ref_kind: it.ref_kind,
        ref_key: it.ref_key,
        secret_id: secretId,
      });
    }

    // redirect back
    res.redirect(303, returnUrl);
  }

  private routePrefix(): string {
    return this.options.apiPrefix ? `/${this.options.apiPrefix}` : '';
  }
}


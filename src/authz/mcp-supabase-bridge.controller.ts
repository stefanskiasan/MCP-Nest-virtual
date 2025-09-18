import {
  Body,
  Controller,
  Header,
  HttpCode,
  Inject,
  Logger,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as jwt from './utils/jwt-lite';
import { JwtTokenService, TokenPair } from './services/jwt-token.service';
import { OAuthModuleOptions } from './providers/oauth-provider.interface';

@Controller('remote-auth/bridge')
export class SupabaseToMcpBridgeController {
  private readonly logger = new Logger(SupabaseToMcpBridgeController.name);

  constructor(
    private readonly jwtTokens: JwtTokenService,
    @Inject('OAUTH_MODULE_OPTIONS')
    private readonly oauthOptions: OAuthModuleOptions,
  ) {}

  /**
   * Exchange a Supabase session JWT for an MCP Resource Access Token.
   * Security note: This endpoint validates the Supabase JWT using HS256 with SUPABASE_JWT_SECRET.
   */
  @Post('supabase-to-mcp')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  async exchange(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any,
  ): Promise<void> {
    try {
      const header = req.headers['authorization'];
      const tokenFromHeader = header?.startsWith('Bearer ')
        ? header.substring('Bearer '.length)
        : undefined;
      const supabaseToken = body?.supabase_token || tokenFromHeader;
      if (!supabaseToken) {
        res.status(400).json({ error: 'MISSING_SUPABASE_TOKEN' });
        return;
      }

      const secret = process.env.SUPABASE_JWT_SECRET;
      if (!secret) {
        res
          .status(500)
          .json({ error: 'SUPABASE_JWT_SECRET not configured on server' });
        return;
      }

      let decoded: any;
      try {
        decoded = jwt.verify(supabaseToken, secret, { algorithms: ['HS256'] });
      } catch (e) {
        res.status(401).json({ error: 'INVALID_SUPABASE_TOKEN' });
        return;
      }

      const userId = decoded.sub || decoded.user_id || decoded.email || 'user';
      const resource = body?.resource || this.oauthOptions.resource;
      const scope = body?.scope || '';

      const pair: TokenPair = this.jwtTokens.generateTokenPair(
        userId,
        'supabase-bridge',
        scope,
        resource,
        { user_profile_id: undefined, user_data: decoded },
      );

      res.json(pair);
    } catch (e) {
      this.logger.error('Supabase→MCP bridge error', e);
      res.status(500).json({ error: 'BRIDGE_ERROR' });
    }
  }
}

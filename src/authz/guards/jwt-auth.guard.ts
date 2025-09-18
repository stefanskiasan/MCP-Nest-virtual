import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload, JwtTokenService } from '../services/jwt-token.service';
import { OAuthModuleOptions } from '../providers/oauth-provider.interface';
import { IOAuthStore } from '../stores/oauth-store.interface';

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Injectable()
export class McpAuthJwtGuard implements CanActivate {
  constructor(
    private readonly jwtTokenService: JwtTokenService,
    @Inject('IOAuthStore') private readonly store: IOAuthStore,
    @Inject('OAUTH_MODULE_OPTIONS') private readonly oauthOptions: OAuthModuleOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token required');
    }

    const payload = this.jwtTokenService.validateToken(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    // Enforce audience/resource
    // Support multiple allowed resources via config string (comma/space) or env OAUTH_ALLOWED_RESOURCES
    const configured = (this.oauthOptions.resource || '').split(/[,\s]+/).filter(Boolean);
    const envList = (process.env.OAUTH_ALLOWED_RESOURCES || '').split(/[,\s]+/).filter(Boolean);
    const allowed = (configured.length ? configured : [this.oauthOptions.resource]).concat(envList).filter(Boolean);

    const aud = (payload as any).aud; // string or string[]
    const resClaim = (payload as any).resource; // string
    const matchAny = (val: string | undefined, list: string[]) => !!val && list.some((r) => r === val);
    const audOk = Array.isArray(aud) ? aud.some((a) => matchAny(a, allowed)) : matchAny(aud, allowed);
    const resOk = matchAny(resClaim, allowed);

    if (!(audOk && resOk)) {
      throw new UnauthorizedException('Invalid audience/resource for this MCP server');
    }

    // Enrich request.user with friendly fields for tools
    const enriched: any = { ...payload };
    try {
      if (!enriched.user_data && enriched.user_profile_id) {
        const profile = await this.store.getUserProfileById(
          enriched.user_profile_id,
        );
        if (profile) {
          enriched.user_data = profile;
        }
      }
      const ud = enriched.user_data || {};
      // Provide convenient top-level fields commonly used by tools
      enriched.username =
        enriched.username || ud.username || ud.id || enriched.sub;
      enriched.email = enriched.email || ud.email;
      enriched.displayName = enriched.displayName || ud.displayName;
      enriched.avatarUrl = enriched.avatarUrl || ud.avatarUrl;
      enriched.name =
        enriched.name ||
        ud.displayName ||
        ud.username ||
        ud.email ||
        enriched.sub;
    } catch {
      // Non-fatal; proceed with raw payload
    }

    request.user = enriched as JwtPayload;
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}

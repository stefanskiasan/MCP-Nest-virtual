import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { OAuthModuleOptions } from '../providers/oauth-provider.interface';

export interface JwtPayload {
  sub: string; // user_id
  azp?: string; // authorized party (client_id for access tokens)
  client_id?: string; // only for refresh tokens
  scope?: string;
  resource?: string; // MCP server resource identifier
  type: 'access' | 'refresh' | 'user';
  user_data?: any;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

@Injectable()
export class JwtTokenService {
  private jwtSecret: string;

  constructor(@Inject('OAUTH_MODULE_OPTIONS') options: OAuthModuleOptions) {
    // Use JWT secret from environment variable
    const jwtSecret = options.jwtSecret;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET must be set in environment variables.');
    }

    this.jwtSecret = jwtSecret;
  }

  generateTokenPair(
    userId: string,
    clientId: string,
    scope = '',
    resource?: string,
  ): TokenPair {
    if (!resource) {
      throw new Error('Resource is required for token generation');
    }

    const jti = randomBytes(16).toString('hex'); // JWT ID for tracking
    const serverUrl = process.env.SERVER_URL || 'https://localhost:3000';

    const accessTokenPayload: any = {
      sub: userId,
      azp: clientId, // Use azp instead of client_id
      gty: 'client_credentials',
      iss: serverUrl,
      aud: resource,
      resource: resource, // Always include resource
      type: 'access' as const,
    };

    // Only include scope if it's not empty
    if (scope && scope.trim() !== '') {
      accessTokenPayload.scope = scope;
    }

    const refreshTokenPayload = {
      sub: userId,
      client_id: clientId,
      scope,
      resource,
      type: 'refresh' as const,
      jti: `refresh_${jti}`,
      iss: serverUrl,
      aud: resource,
    };

    const accessToken = jwt.sign(accessTokenPayload, this.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: '1h',
    });

    const refreshToken = jwt.sign(refreshTokenPayload, this.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: '30d',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: 3600, // 1 hour
    };
  }

  validateToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
      }) as JwtPayload;
    } catch {
      return null;
    }
  }

  refreshAccessToken(refreshToken: string): TokenPair | null {
    const payload = this.validateToken(refreshToken);

    if (!payload || payload.type !== 'refresh') {
      return null;
    }

    return this.generateTokenPair(
      payload.sub,
      payload.client_id!,
      payload.scope,
      payload.resource,
    );
  }

  generateUserToken(userId: string, userData: any): string {
    const jti = randomBytes(16).toString('hex');
    const serverUrl = process.env.SERVER_URL || 'https://localhost:3000';

    const payload = {
      sub: userId,
      type: 'user',
      user_data: userData,
      jti: `user_${jti}`,
      iss: serverUrl,
      aud: 'mcp-client',
    };

    return jwt.sign(payload, this.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: '24h',
    });
  }
}

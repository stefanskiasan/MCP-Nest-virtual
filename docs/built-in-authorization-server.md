# Built-in OAuth Authorization Module

The `McpAuthModule` provides a complete OAuth 2.1 compliant Identity Provider (IdP) implementation for securing MCP servers. It fully implements the [MCP Authorization specification (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization) and includes built-in support for popular OAuth providers like [GitHub](../src/authz/providers/github.provider.ts) and [Google](../src/authz/providers/google.provider.ts).

## Features

- **🔒 OAuth 2.1 Compliance**: Fully compliant with OAuth 2.1 and MCP Authorization specification
- **🏪 Multiple Storage Options**: In-memory (testing), TypeORM (production), or custom storage backends
- **🌐 Provider Support**: Built-in GitHub and Google OAuth providers with extensible provider system
- **🔑 Dynamic Client Registration**: RFC 7591 compliant client registration
- **📊 Authorization Server Discovery**: RFC 8414 and RFC 9728 compliant metadata endpoints
- **🛡️ Security**: PKCE, Resource Indicators (RFC 8707), and comprehensive token validation
- **⚡ NestJS Integration**: Seamless integration with NestJS dependency injection and guards

## Quick Start

### Basic Setup

```typescript
import { McpModule } from '@rekog/mcp-nest';

@Module({
  imports: [
    McpAuthModule.forRoot({
      provider: GitHubOAuthProvider,
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      jwtSecret: process.env.JWT_SECRET!,
      serverUrl: 'https://your-server.com', // or when running locally point to localhost e.g. http://localhost:3030
      apiPrefix: 'auth', // All OAuth endpoints will be under /*
    }),
    McpModule.forRoot({
      name: 'secure-mcp-server',
      version: '1.0.0',
      guards: [McpAuthJwtGuard], // Protect all MCP endpoints
    }),
  ],
  providers: [McpAuthJwtGuard],
})
export class AppModule {}
```

## Configuration Options

### Required Options

| Option | Type | Description |
|--------|------|-------------|
| `provider` | [`OAuthProviderConfig`](../src/authz/providers/oauth-provider.interface.ts) | OAuth provider configuration ([GitHubOAuthProvider](../src/authz/providers/github.provider.ts), [GoogleOAuthProvider](../src/authz/providers/google.provider.ts), or custom) |
| `clientId` | `string` | OAuth client ID from your provider |
| `clientSecret` | `string` | OAuth client secret from your provider |
| `jwtSecret` | `string` | JWT signing secret (minimum 32 characters) |

### Optional Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `serverUrl` | `string` | `'https://localhost:3000'` | Base URL of your server |
| `jwtIssuer` | `string` | `serverUrl` | JWT issuer claim |
| `jwtAudience` | `string` | `'mcp-client'` | JWT audience claim |
| `jwtAccessTokenExpiresIn` | `string` | `'60s'` | Access token expiration |
| `jwtRefreshTokenExpiresIn` | `string` | `'30d'` | Refresh token expiration |
| `apiPrefix` | `string` | `''` | Prefix for all OAuth endpoints |
| `cookieSecure` | `boolean` | `nodeEnv === 'production'` | Use secure cookies |
| `cookieMaxAge` | `number` | `24 * 60 * 60 * 1000` | Cookie expiration (24 hours) |
| `oauthSessionExpiresIn` | `number` | `10 * 60 * 1000` | OAuth session timeout (10 minutes) |
| `authCodeExpiresIn` | `number` | `10 * 60 * 1000` | Authorization code timeout (10 minutes) |
| `endpoints` | `object` | See below | Custom endpoint paths |
| `storeConfiguration` | [`IOAuthStore`](../src/authz/stores/oauth-store.interface.ts) | In-memory | Storage backend configuration |

### Endpoint Configuration

```typescript
{
  endpoints: {
    wellKnown: '/.well-known/oauth-authorization-server',
    register: '/register',
    authorize: '/authorize',
    auth: '/auth',
    callback: '/callback',
    token: '/token',
    validate: '/validate',
    revoke: '/revoke',
  }
}
```

## Storage Backends

### In-Memory Store (Default)

Perfect for development and testing:

```typescript
McpAuthModule.forRoot({
  // ... other options
  // No storeConfiguration needed - uses in-memory by default
})
```

### TypeORM Store

For production use with persistent storage:

```typescript
McpAuthModule.forRoot({
  // ... other options
  storeConfiguration: {
    type: 'typeorm',
    options: {
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'user',
      password: 'password',
      database: 'oauth_db',
      synchronize: true, // Set to false in production
      logging: false,
    },
  },
})
```

Supported TypeORM databases: PostgreSQL, MySQL, SQLite, SQL Server, Oracle, and more.

### Custom Store

Implement your own storage backend:

```typescript
import { IOAuthStore } from '@rekog/mcp-nest'; // See: [IOAuthStore interface](../src/authz/stores/oauth-store.interface.ts)

class CustomStore implements IOAuthStore {
  // Implement required methods
}

McpAuthModule.forRoot({
  // ... other options
  storeConfiguration: {
    type: 'custom',
    store: new CustomStore(),
  },
})
```

## OAuth Providers

### GitHub Provider

```typescript
import { GitHubOAuthProvider } from '@rekog/mcp-nest'; // See: [GitHubOAuthProvider](../src/authz/providers/github.provider.ts)

// GitHub App setup required:
// 1. Create GitHub App at https://github.com/settings/apps
// 2. Set Authorization callback URL to: https://your-server.com/callback
// 3. Note the Client ID and generate Client Secret

McpAuthModule.forRoot({
  provider: GitHubOAuthProvider,
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  // ... other options
})
```

### Google Provider

```typescript
import { GoogleOAuthProvider } from '@rekog/mcp-nest'; // See: [GoogleOAuthProvider](../src/authz/providers/google.provider.ts)

// Google Cloud Console setup required:
// 1. Create OAuth 2.0 Client ID at https://console.cloud.google.com/apis/credentials
// 2. Add redirect URI: https://your-server.com/callback
// 3. Note the Client ID and Client Secret

McpAuthModule.forRoot({
  provider: GoogleOAuthProvider,
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  // ... other options
})
```

### Custom Provider

Create your own OAuth provider:

```typescript
import { OAuthProviderConfig } from '@rekog/mcp-nest'; // See: [OAuthProviderConfig](../src/authz/providers/oauth-provider.interface.ts)

export const CustomOAuthProvider: OAuthProviderConfig = {
  name: 'custom',
  strategy: CustomStrategy, // Implement Passport strategy
  scopes: ['read:user'],
};
```

## Security Features

### PKCE (Proof Key for Code Exchange)

Automatically implemented for all authorization flows to prevent authorization code interception attacks.

### Resource Indicators (RFC 8707)

Tokens are bound to specific MCP servers using the `resource` parameter, preventing token reuse across different services.

### Token Validation

- **Audience Validation**: Tokens are validated against the intended MCP server
- **Expiration Checking**: Both access and refresh tokens have configurable expiration
- **Signature Verification**: JWT tokens are cryptographically verified

## API Endpoints

When `apiPrefix` is set to `'auth'`, the following endpoints are available:

### Authorization Server Metadata

- **GET** `/.well-known/oauth-authorization-server` - OAuth server metadata (RFC 8414)

### OAuth Flow Endpoints

- **POST** `/register` - Dynamic client registration (RFC 7591)
- **GET** `/authorize` - Authorization endpoint
- **GET** `/callback` - OAuth callback endpoint
- **POST** `/token` - Token endpoint
- **POST** `/validate` - Token validation
- **POST** `/revoke` - Token revocation

## Development Example

Complete working example from the playground:

```typescript
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import {
  McpAuthModule,
  McpModule,
  GitHubOAuthProvider,
  McpAuthJwtGuard
} from '@rekog/mcp-nest';

@Module({
  imports: [
    McpAuthModule.forRoot({
      provider: GitHubOAuthProvider,
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      jwtSecret: process.env.JWT_SECRET!,
      serverUrl: 'http://localhost:3030',
      apiPrefix: 'auth',
    }),
    McpModule.forRoot({
      name: 'secure-mcp-server',
      version: '1.0.0',
      streamableHttp: {
        enableJsonResponse: false,
        sessionIdGenerator: () => randomUUID(),
        statelessMode: false,
      },
      guards: [McpAuthJwtGuard], // See: [McpAuthJwtGuard](../src/authz/guards/jwt-auth.guard.ts)
    }),
  ],
  providers: [McpAuthJwtGuard], // See: [McpAuthJwtGuard](../src/authz/guards/jwt-auth.guard.ts)
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Required for OAuth session management
  app.use(cookieParser());

  // Enable CORS for client applications
  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.listen(3030);
  console.log('Secure MCP Server running on http://localhost:3030');
}
```

## Environment Variables

Create a `.env` file with the required variables:

```bash
# OAuth Provider (GitHub example)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long

# Server Configuration
SERVER_URL=https://your-server.com
NODE_ENV=production

# Database (if using TypeORM)
DATABASE_URL=postgresql://user:password@localhost:5432/oauth_db
```

## Troubleshooting

### Common Issues

1. **JWT Secret Too Short**: Ensure `jwtSecret` is at least 32 characters
2. **Invalid Redirect URI**: OAuth provider redirect URI must match `{serverUrl}/{apiPrefix}/callback`
3. **CORS Issues**: Enable CORS with `credentials: true` for browser-based clients
4. **Cookie Problems**: Ensure `cookieParser()` middleware is installed for session management

### Debug Mode

Enable detailed logging in development:

```typescript
McpAuthModule.forRoot({
  // ... other options
  storeConfiguration: {
    type: 'typeorm',
    options: {
      logging: true, // Enable SQL logging
    },
  },
})
```

## Security Best Practices

1. **Use HTTPS**: Always use HTTPS in production
2. **Strong JWT Secret**: Use a cryptographically strong JWT secret
3. **Short-lived Tokens**: Keep access token expiration short (e.g., 1 hour)
4. **Secure Cookies**: Enable secure cookies in production
5. **Environment Variables**: Never commit secrets to version control
6. **Database Security**: Use proper database credentials and network security
7. **Rate Limiting**: Implement rate limiting on OAuth endpoints
8. **Audit Logging**: Log authentication events for security monitoring

## Advanced Configuration

### Custom JWT Claims

Add custom claims to JWT tokens:

```typescript
// This is handled automatically by the module based on OAuth provider response
// The user information from GitHub/Google is included in the JWT payload
```

### Multiple OAuth Providers

Currently, one provider per module instance is supported. For multiple providers, create separate module instances with different `apiPrefix` values.

### Integration with Existing Authentication

The module can work alongside existing NestJS authentication systems. Use different API prefixes to avoid conflicts.

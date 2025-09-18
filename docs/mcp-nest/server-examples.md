# Server Examples (mcp-nest)

This guide shows different ways to set up MCP servers using mcp-nest with various transport types and configurations.

## HTTP Server (Stateful)

```typescript
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'crypto';
import { McpModule } from '@rekog/mcp-nest';
import { GreetingTool } from './greeting.tool';
import { GreetingResource } from './greeting.resource';
import { GreetingPrompt } from './greeting.prompt';

@Module({
  imports: [
    McpModule.forRoot({
      name: 'playground-mcp-server',
      version: '0.0.1',
      streamableHttp: {
        enableJsonResponse: false,
        sessionIdGenerator: () => randomUUID(),
        statelessMode: false,
      },
    }),
  ],
  providers: [GreetingResource, GreetingTool, GreetingPrompt],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3030);
  console.log('MCP server started on port 3030');
}

void bootstrap();
```

Endpoints:
- POST /mcp — Main MCP operations
- GET /mcp — SSE stream for real-time updates
- DELETE /mcp — Session termination

Run:
```bash
npx ts-node-dev --respawn playground/servers/server-stateful.ts
```

Test:
```bash
npx @modelcontextprotocol/inspector@0.16.2
```
Connect to: `http://localhost:3030/mcp`

## HTTP Server (Stateless)

```typescript
@Module({
  imports: [
    McpModule.forRoot({
      name: 'playground-mcp-server',
      version: '0.0.1',
      transport: McpTransportType.STREAMABLE_HTTP,
      streamableHttp: {
        enableJsonResponse: true,
        sessionIdGenerator: undefined,
        statelessMode: true,
      },
    }),
  ],
  providers: [GreetingResource, GreetingTool, GreetingPrompt],
})
class AppModule {}
```

Endpoints: POST /mcp

Run:
```bash
npx ts-node-dev --respawn playground/servers/server-stateless.ts
```

## STDIO Server

```typescript
import { McpTransportType } from '@rekog/mcp-nest';

@Module({
  imports: [
    McpModule.forRoot({
      name: 'playground-stdio-server',
      version: '0.0.1',
      transport: McpTransportType.STDIO,
    }),
  ],
  providers: [GreetingTool, GreetingPrompt, GreetingResource],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  return app.close();
}

void bootstrap();
```

Run:
```bash
npx ts-node-dev --respawn playground/servers/stdio.ts
```

MCP client config example:
```json
{
  "mcpServers": {
    "greeting": {
      "command": "node",
      "args": ["dist/playground/servers/stdio.js"]
    }
  }
}
```

## Multiple Transport Types

```typescript
@Module({
  imports: [
    McpModule.forRoot({
      name: 'multi-transport-server',
      version: '0.0.1',
      transport: [
        McpTransportType.SSE,
        McpTransportType.STREAMABLE_HTTP,
        // McpTransportType.STDIO
      ],
    }),
  ],
  providers: [GreetingTool],
})
class AppModule {}
```

Endpoints:
- GET /sse — SSE connection
- POST /messages — Tool execution (SSE transport)
- POST /mcp — Streamable HTTP operations

## Server with Authentication

```typescript
import { AuthGuard } from './auth.guard';

@Module({
  imports: [
    McpModule.forRoot({
      name: 'secure-mcp-server',
      version: '0.0.1',
      guards: [AuthGuard],
    }),
  ],
  providers: [GreetingTool, AuthGuard],
})
class AppModule {}
```

### Disabling OAuth Discovery Endpoints

```typescript
@Module({
  imports: [
    McpAuthModule.forRoot({
      disableEndpoints: {
        wellKnownAuthorizationServerMetadata: true,
        wellKnownProtectedResourceMetadata: false,
      },
    }),
    McpModule.forRoot({
      name: 'secure-mcp-server',
      version: '0.0.1',
      guards: [McpAuthJwtGuard],
    }),
  ],
  providers: [GreetingTool, McpAuthJwtGuard],
})
class AppModule {}
```

## Custom Endpoints

```typescript
@Module({
  imports: [
    McpModule.forRoot({
      name: 'custom-endpoints-server',
      version: '0.0.1',
      apiPrefix: 'api/v1',
      sseEndpoint: 'events',
      messagesEndpoint: 'chat',
      mcpEndpoint: 'mcp-operations',
    }),
  ],
  providers: [GreetingTool],
})
class AppModule {}
```

Endpoints:
- GET /api/v1/events
- POST /api/v1/chat
- POST /api/v1/mcp-operations

## Fastify Server

```typescript
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  await app.listen(3030, '0.0.0.0');
}
```

Run:
```bash
npx ts-node-dev --respawn playground/servers/server-stateful-fastify.ts
```

## Global Prefix Integration

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('/api', { exclude: ['sse', 'messages', 'mcp'] });
  await app.listen(3030);
}
```

## Testing

Inspector:
```bash
npx @modelcontextprotocol/inspector@0.16.2
```

curl examples:
```bash
curl -X POST http://localhost:3030/mcp -H "Content-Type: application/json" -d '{"method":"tools/list"}'

curl -X POST http://localhost:3030/mcp -H "Content-Type: application/json" -d '{
  "method":"tools/call",
  "params": {"name":"greet-user","arguments": {"name":"Alice","language":"en"}}
}'
```

## Advanced Server Pattern

```typescript
@Module({
  imports: [
    McpModule.forRoot({ name: 'advanced-server', version: '1.0.0', transport: [] }),
  ],
  controllers: [CustomSseController, CustomStreamableController],
  providers: [GreetingTool],
})
class AppModule {}
```

See dynamic server id routing guide for custom controllers.


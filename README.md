# NestJS MCP Server Module

A NestJS module for exposing your services as an MCP (Model Context Protocol) server with Server-Sent Events (SSE) transport. This package simplifies exposing tools that clients can discover and execute via SSE.

## Features

- **SSE Transport**: Built-in `/sse` endpoint for streaming and `/messages` for handling tool execution
- **Tool Discovery**: Automatically discover and register tools using decorators
- **Tool Request Validation**: Define Zod schemas to validate tool requests.
- **Progress Notifications**: Send continuous progress updates from tools to clients.

## Installation

```bash
npm install @rekog/mcp-nest reflect-metadata @modelcontextprotocol/sdk zod
```

## Quick Start

### 1. Import Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { McpModule } from '@rekog/mcp-nest';
import { GreetingTool } from './greeting.tool';

@Module({
  imports: [
    McpModule.forRoot({
      name: 'my-mcp-server',
      version: '1.0.0',
      capabilities: {}
    })
  ],
  providers: [GreetingTool]
})
export class AppModule {}
```

### 2. Define Tools

```typescript
// greeting.tool.ts
import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import { RequestSchema } from '@modelcontextprotocol/sdk/types.js';

const ProgressRequestSchema = RequestSchema.extend({
  method: z.literal('progress/request'),
  params: z.object({
    _meta: z.object({
      progressToken: z.union([z.string(), z.number().int()]).optional(),
    }).optional(),
  }).optional(),
});

@Injectable()
export class GreetingTool {
  @Tool('hello', 'Returns greeting', {
    schema: {
      name: z.string().default('World')
    }
  })
  greet({ name }: { name: string }) {
    return {
      content: [{ type: 'text', text: `Hello ${name}!` }]
    };
  }

  @Tool('progress-test', 'A tool that simulates progress', {
    requestSchema: ProgressRequestSchema,
  })
  async progressTest(params, context) {
      const progressToken = params._meta?.progressToken;

      for (let i = 0; i <= 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (progressToken) {
          await context.sendNotification({
            method: 'notifications/progress',
            params: {
              progressToken,
              progress: i,
              total: 5,
            },
          });
          console.log(`Sent progress: \${i}/5`);
        }
      }

      return {
        message: 'Progress test completed!',
      };
  }
}
```

### 3. Start Server

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

## Client Connection

Clients can connect using the MCP SDK:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse';

const client = new Client(
  { name: 'client-name', version: '1.0.0' },
  { capabilities: {} }
);

await client.connect(
  new SSEClientTransport(new URL('<http://localhost:3000/sse>'))
);

// Execute tool
const result = await client.callTool({
  name: 'hello',
  arguments: { name: 'World' }
});

// Execute tool with request schema and receive progress notifications
const progressResult = await client.request(
  {
    method: 'progress/request',
    params: {
      _meta: {
        progressToken: 'test-token',
      },
    },
  },
  z.object({ message: z.string() }),
  {
    onprogress: (progress) => {
      console.log('Received progress:', progress);
    },
  },
);
```

## API Endpoints

- `GET /sse`: SSE connection endpoint
- `POST /messages`: Tool execution endpoint

## Configuration Reference

### `McpOptions`

| Property       | Type                      | Description                  |
|----------------|---------------------------|------------------------------|
| `name`         | string                    | Server name                  |
| `version`      | string                    | Server version               |
| `capabilities` | Record<string, any>       | Server capabilities          |
| `sseEndpoint` | string (optional) | Endpoint for SSE connections. Defaults to `'sse'`. |
| `messagesEndpoint` | string (optional) | Endpoint for handling tool execution. Defaults to `'messages'`. |
| `globalApiPrefix` | string (optional) | Global API prefix for all endpoints. Defaults to an empty string `''`. |

### Tool Decorator

The `@Tool` decorator is used to define a method as an MCP tool.

```typescript
@Tool(name: string, description: string, options: { schema?: any, requestSchema?: z.ZodObject<any> })
```

- `name`: The name of the tool.
- `description`: A description of the tool.
- `options.schema`: (Optional) A Zod schema defining the expected structure of the tool's input arguments.
- `options.requestSchema`: (Optional) A Zod schema extending the base `RequestSchema` to validate the entire request structure, including method name and metadata.

### Context Object

When defining a tool, you can access a context object passed as the second argument to the tool method. This object provides methods for sending notifications, errors, and responses.

```typescript
{
  sendNotification: async (notification: any) => { ... },
  sendError: async (message: string, data?: any) => { ... },
  sendResponse: async (response: any) => { ... }
}
```

- `sendNotification`: Sends a notification to the client.
- `sendError`: Sends an error response to the client.
- `sendResponse`: Sends a successful response to the client.

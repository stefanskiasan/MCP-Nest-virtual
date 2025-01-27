# NestJS MCP Server Module

A NestJS module for exposing your services as an MCP (Model Context Protocol) server with Server-Sent Events (SSE) transport. This package simplifies exposing tools that clients can discover and execute via SSE.

## Features

- **SSE Transport**: Built-in `/sse` endpoint for streaming and `/messages` for handling tool execution
- **Tool Discovery**: Automatically discover and register tools using decorators

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
      capabilities: { /* ... */ }
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

@Injectable()
export class GreetingTool {
  @Tool('hello', 'Returns greeting', {
    name: z.string().default('World')
  })
  greet({ name }: { name: string }) {
    return {
      content: [{ type: 'text', text: `Hello ${name}!` }]
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
  new SSEClientTransport(new URL('http://localhost:3000/sse'))
);

// Execute tool
const result = await client.callTool({
  name: 'hello',
  arguments: { name: 'World' }
});
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

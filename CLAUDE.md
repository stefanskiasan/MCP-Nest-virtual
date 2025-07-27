# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# NestJS MCP Server Module

## Project Overview
This is `@rekog/mcp-nest`, a NestJS module that transforms NestJS applications into Model Context Protocol (MCP) servers. It exposes tools, resources, and prompts for AI consumption via decorators, supporting multiple transport protocols (HTTP+SSE, Streamable HTTP, STDIO).

## Essential Development Commands

### Build, Test & Quality
```bash
npm run build              # TypeScript compilation with source maps
npm test                   # Jest with experimental VM modules (required for ES modules)
npm run test:watch         # Jest in watch mode
npm run lint               # ESLint with automatic fixes
npm run format             # Prettier formatting for src and tests
```

### Running Playground Examples
```bash
npm run start:playground   # Default stateful server (Express)
npm run start:fastify      # Fastify adapter server
npm run test:fastify       # Test Fastify client connection
```

### Single Test Execution
```bash
# Run specific test file
npx --node-options=--experimental-vm-modules jest tests/mcp-tool.e2e.spec.ts

# Run tests matching pattern
npx --node-options=--experimental-vm-modules jest --testNamePattern="auth"
```

## Core Architecture Patterns

### 1. Decorator-Based Registration System
Tools, resources, and prompts are discovered through decorators using NestJS's reflection capabilities:

```typescript
@Injectable()
export class MyService {
  @Tool({
    name: 'my-tool',
    description: 'Description',
    parameters: z.object({ name: z.string() }),
    outputSchema: z.object({ result: z.string() }), // Optional
    annotations: { readOnlyHint: true } // Optional
  })
  async myTool({ name }, context: Context, request: Request) {
    await context.reportProgress({ progress: 50, total: 100 });
    return { content: [{ type: 'text', text: `Hello ${name}` }] };
  }
}
```

**Key Pattern**: Method signature is `(args, context, httpRequest)` where:
- `args`: Zod-validated parameters
- `context`: MCP context with `reportProgress`, `mcpServer`, `mcpRequest`, logging
- `httpRequest`: HTTP request object (undefined for STDIO)

### 2. Multi-Transport Architecture
Three transport types with different controllers:
- **SSE**: `createSseController()` - GET `/sse` + POST `/messages`
- **Streamable HTTP**: `createStreamableHttpController()` - POST `/mcp` (+ GET/DELETE for stateful)
- **STDIO**: `StdioService` - No HTTP endpoints

Each transport creates dynamic controllers via factory functions in `McpModule.forRoot()`.

### 3. Request Scoping & Dependency Injection
Uses NestJS's request scoping for per-request instances:
```typescript
@Injectable({ scope: Scope.REQUEST })
export class RequestScopedService {
  constructor(@Inject(REQUEST) private request: Request) {}
}
```

The `McpExecutorService` (REQUEST-scoped) orchestrates handler registration per request.

### 4. Module Instance Isolation
Each `McpModule.forRoot()` call creates a unique module instance with its own `moduleId`:
```typescript
const moduleId = `mcp-module-${instanceIdCounter++}`;
```
This enables multiple MCP servers in one application with different endpoints/capabilities.

## Testing Patterns

### E2E Test Structure
The test suite comprehensively covers all transport types:
- E2E tests create actual NestJS apps with different transport configurations
- Tests run the same scenarios across HTTP+SSE, Streamable HTTP (stateful/stateless), and STDIO
- Use `createSseClient()`, `createStreamableClient()`, `createStdioClient()` helpers

### Test File Patterns
- `*.e2e.spec.ts` - End-to-end integration tests
- `*.spec.ts` - Unit tests
- All tests require `--node-options=--experimental-vm-modules` flag

## Critical Implementation Details

### Output Schema Validation
Tools with `outputSchema` get validated results. Failed validation throws `McpError`:
```typescript
if (outputSchema) {
  const validation = outputSchema.safeParse(result);
  if (!validation.success) {
    throw new McpError(ErrorCode.InternalError, `Tool result does not match outputSchema`);
  }
  return { structuredContent: result, content: this.buildDefaultContentBlock(result) };
}
```

### Resource URI Matching
Resources use `path-to-regexp` for dynamic URI matching:
- Static: `uri: 'mcp://hello-world'`
- Template: `uriTemplate: 'mcp://hello-world/{userId}/{userName}'`

Templates extract parameters using `match()` function with URL decoding.

### Authentication Integration
Guards apply to all MCP endpoints:
```typescript
McpModule.forRoot({
  guards: [AuthGuard], // Applied to SSE/messages/mcp endpoints
})
```
Request context flows through to tools via dependency injection.

## Project-Specific Conventions

### File Organization
- `src/mcp/` - Core MCP functionality
- `src/authz/` - OAuth authentication module  
- `src/mcp/decorators/` - Tool/Resource/Prompt decorators
- `src/mcp/services/handlers/` - Protocol request handlers
- `src/mcp/transport/` - Transport implementations
- `playground/` - Working examples
- `tests/` - Comprehensive E2E test suite

### Error Handling Patterns
MCP tools should return standardized error format:
```typescript
return {
  content: [{ type: 'text', text: error.message }],
  isError: true,
};
```

### Registry Service Pattern
`McpRegistryService` discovers decorated methods at bootstrap using `DiscoveryService` and `MetadataScanner`. It maintains maps by `mcpModuleId` for isolation.

### HTTP Adapter Abstraction
`HttpAdapterFactory` provides framework-agnostic request/response handling for Express/Fastify compatibility.

## Key Integration Points

### With NestJS Ecosystem
- Full DI container integration
- Guard/Interceptor support
- Request scoping
- Module system
- Versioning compatibility (VERSION_NEUTRAL)

### With MCP SDK
- Wraps `@modelcontextprotocol/sdk` transports
- Handles MCP protocol schemas
- Progress reporting via context
- Elicitation support for interactive tools

### External Dependencies
- `zod` for parameter validation
- `path-to-regexp` for URI matching
- `zod-to-json-schema` for OpenAPI-style schemas

## Important Notes from Copilot Instructions

- This module transforms NestJS services into MCP servers through decorators, not the other way around
- The NestJS application hosts the MCP server, making existing business logic available to AI systems
- Each `McpModule.forRoot()` creates an isolated instance with unique endpoints
- Authentication uses standard NestJS Guards applied at the transport level
- Progress reporting is handled through the MCP context object passed to tools
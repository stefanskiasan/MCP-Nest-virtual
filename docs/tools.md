# Tools

Tools are functions that AI agents can execute to perform actions or computations. In mcp-nest, tools are defined using the `@Tool()` decorator on service methods.

## Basic Tool

```typescript
import { Injectable } from '@nestjs/common';
import { Tool, Context } from '@rekog/mcp-nest';
import { z } from 'zod';

@Injectable()
export class GreetingTool {
  @Tool({
    name: 'greet-user',
    description: "Returns a personalized greeting in the user's preferred language",
    parameters: z.object({
      name: z.string().describe('The name of the person to greet'),
      language: z.string().describe('Language code (e.g., "en", "es", "fr")'),
    }),
  })
  async sayHello({ name, language }, context: Context, request: Request) {
    const greetings = {
      en: 'Hey',
      es: 'Qué tal',
      fr: 'Salut',
    };

    const greeting = greetings[language] || greetings.en;
    return `${greeting}, ${name}!`;
  }
}
```

## Tool with Progress Reporting

```typescript
@Tool({
  name: 'process-data',
  description: 'Processes data with progress updates',
  parameters: z.object({
    data: z.string(),
  }),
})
async processData({ data }, context: Context) {
  const totalSteps = 5;

  for (let i = 0; i < totalSteps; i++) {
    await new Promise(resolve => setTimeout(resolve, 100));

    // Report progress to the client
    await context.reportProgress({
      progress: (i + 1) * 20,
      total: 100,
    });
  }

  return `Processed: ${data}`;
}
```

## Tool with Output Schema

Tools can define structured output schemas for type safety:

```typescript
@Tool({
  name: 'greet-user-structured',
  description: 'Returns a structured greeting with metadata',
  parameters: z.object({
    name: z.string(),
    language: z.string(),
  }),
  outputSchema: z.object({
    greeting: z.string(),
    language: z.string(),
    languageName: z.string(),
  }),
})
async sayHelloStructured({ name, language }) {
  return {
    greeting: `Hey, ${name}!`,
    language,
    languageName: 'English',
  };
}
```

## Interactive Tool with Elicitation

Tools can request additional input from users:

```typescript
@Tool({
  name: 'greet-user-interactive',
  description: 'Interactive greeting with language selection',
  parameters: z.object({
    name: z.string(),
  }),
})
async sayHelloInteractive({ name }, context: Context) {
  const response = await context.mcpServer.server.elicitInput({
    message: 'Please select your preferred language',
    requestedSchema: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          enum: ['en', 'es', 'fr', 'de'],
          description: 'Your preferred language',
        },
      },
    },
  });

  const selectedLanguage = response.action === 'accept'
    ? response.content.language
    : 'en';

  return `Hello, ${name}! (in ${selectedLanguage})`;
}
```

## Tool Annotations

Add metadata to your tools:

```typescript
@Tool({
  name: 'read-file',
  description: 'Reads a file safely',
  parameters: z.object({
    path: z.string(),
  }),
  annotations: {
    title: 'Safe File Reader',
    destructiveHint: false,    // Tool doesn't modify data
    readOnlyHint: true,        // Tool only reads data
    idempotentHint: true,      // Same input = same output
    openWorldHint: false,      // Tool has predictable behavior
  },
})
async readFile({ path }) {
  // Implementation
}
```

## Testing Your Tools

### 1. Start the Server

Run the playground server:

```bash
ts-node-dev --respawn playground/servers/server-stateful.ts
```

### 2. List Available Tools

```bash
npx @modelcontextprotocol/inspector@0.16.2 --cli http://localhost:3030/mcp --transport http --method tools/list
```

Expected output:

```json
{
  "tools": [
    {
      "name": "greet-user",
      "description": "Returns a personalized greeting in the user's preferred language",
      "inputSchema": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "The name of the person to greet"
          },
          "language": {
            "type": "string",
            "description": "Language code (e.g., \"en\", \"es\", \"fr\", \"de\")"
          }
        },
        "required": ["name", "language"]
      }
    }
  ]
}
```

### 3. Call a Tool

**Basic tool call:**

```bash
npx @modelcontextprotocol/inspector@0.16.2 --cli http://localhost:3030/mcp --transport http --method tools/call --tool-name greet-user --tool-arg name=Alice --tool-arg language=es
```

Expected output:

```json
{
  "content": [
    {
      "type": "text",
      "text": "\"Qué tal, Alice!\""
    }
  ]
}
```

**Interactive tool call:**

Interactive tool calls, use elicitation to get additional input from users. The **MCP Inspector CLI currently doesn't support elicitation**, but as soon as this [GitHub issue](https://github.com/modelcontextprotocol/inspector/issues/524) is resolved, you can test it with the command below. **In the meantime, you can test it using the MCP Inspector UI.**

```bash
npx @modelcontextprotocol/inspector@0.16.2 --cli http://localhost:3030/mcp --transport http --method tools/call --tool-name greet-user-interactive --tool-arg name=Bob
```

Elicited input:

```text
language: en
```

Expected output:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Hey, Bob!"
    }
  ]
}
```

**Structured tool call (with output schema):**

```bash
npx @modelcontextprotocol/inspector@0.16.2 --cli http://localhost:3030/mcp --transport http --method tools/call --tool-name greet-user-structured --tool-arg name=Charlie --tool-arg language=fr
```

Expected output:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"greeting\": \"Salut, Charlie!\",\n  \"language\": \"fr\",\n  \"languageName\": \"French\"\n}"
    }
  ],
  "structuredContent": {
    "greeting": "Salut, Charlie!",
    "language": "fr",
    "languageName": "French"
  }
}
```

### 4. Interactive Testing

For interactive testing with progress updates, use the MCP Inspector UI:

```bash
npx @modelcontextprotocol/inspector@0.16.2
```

Connect to `http://localhost:3030/mcp` to test your tools interactively and see progress reporting in real-time.

## Example Location

See the complete example at: `playground/resources/greeting.tool.ts`

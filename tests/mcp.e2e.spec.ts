import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Injectable } from '@nestjs/common';
import { McpModule } from '../src/mcp.module';
import { McpOptions } from '../src/interfaces';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { Tool } from '../src';

@Injectable()
export class GreetingTool {
  constructor() {}

  @Tool('hello-world', 'A sample tool that returns a greeting', {
    name: z.string().default('World'),
  })
  sayHello({ name }) {
    const greeting = `Hello, ${name}!`;

    return {
      content: [
        {
          type: 'text',
          text: greeting,
        },
      ],
    };
  }
}


describe('E2E: MCP Server via SSE', () => {
  let app: INestApplication;
  let testPort: number;

  beforeAll(async () => {
    const testOptions: McpOptions = {
      name: 'test-mcp-server',
      version: '0.0.1',
      capabilities: {
        tools: {
          'hello-world': {
            description: 'A sample tool that returns a greeting',
            input: {
              name: {
                type: 'string',
                default: 'World',
              },
            },
          },
        },
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [McpModule.forRoot(testOptions)],
      providers: [GreetingTool],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);

    const server = app.getHttpServer();
    testPort = server.address().port;  // since we used port 0, Node picks a random open port
  });

  afterAll(async () => {
    await app.close();
  });

  it('should list tools and call the "hello-world" tool via SSE', async () => {
    const client = new Client(
      { name: 'example-client', version: '1.0.0' },
      { capabilities: {} },
    );

    const sseUrl = new URL(`http://localhost:${testPort}/sse`);
    const transport = new SSEClientTransport(sseUrl);
    await client.connect(transport);

    const tools = await client.listTools() ;
    expect((tools.tools[0] as any).name).toBe('hello-world');

    const result = await client.callTool({
      name: 'hello-world',
      arguments: { name: 'World' },
    });

    expect(result).toEqual({
      content: [
        { type: 'text', text: 'Hello, World!' },
      ],
    });
    await client.close();
  });
});

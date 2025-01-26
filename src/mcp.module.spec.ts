import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpOptions } from './interfaces';
import { McpModule } from './mcp.module';

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from './decorators';

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


describe('McpModule', () => {
  let app: INestApplication;
  let mcpServer: McpServer;

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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [McpModule.forRoot(testOptions)],
      providers: [GreetingTool],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    mcpServer = moduleFixture.get<McpServer>('MCP_SERVER');
  });

  afterAll(async () => {
    await app.close();
  });

  it('should compile and inject MCP_SERVER', async () => {
    expect(mcpServer).toBeDefined();
  });

  it('should discover and register the GreetingTool on the McpServer', async () => {
    const tools = await (mcpServer as any)._registeredTools;
    expect(tools).toBeDefined();
    expect(tools).toHaveProperty('hello-world');
  });
});

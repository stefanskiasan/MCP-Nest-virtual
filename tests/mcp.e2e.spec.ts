import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { INestApplication, Injectable } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { z } from 'zod';
import { Tool } from '../src';
import { McpOptions } from '../src/interfaces';
import { McpModule } from '../src/mcp.module';

// Mock UserRepository for testing
@Injectable()
class MockUserRepository {
  async findOne() {
    return {
      id: 'user123',
      name: 'Test User',
      orgMemberships: [
        {
          orgId: 'org123',
          organization: {
            name: 'Test Org',
          },
        },
      ],
    };
  }
}

@Injectable()
export class GreetingTool {
  constructor(private readonly userRepository: MockUserRepository) {}

  @Tool('hello-world', 'A sample tool that returns a greeting', {
    name: z.string().default('World'),
  })
  async sayHello({ name }) {
    const user = await this.userRepository.findOne();
    const greeting = `Hello, ${name}! I'm ${user.name} from ${user.orgMemberships[0].organization.name}.`;

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
      providers: [GreetingTool, MockUserRepository], // Include MockUserRepository
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);

    const server = app.getHttpServer();
    testPort = server.address().port;  // since we used port 0, Node picks a random open port
  });

  afterAll(async () => {
    await app.close();
  });

  it('should inject dependencies into the tool and call the "hello-world" tool via SSE', async () => {
    const client = new Client(
      { name: 'example-client', version: '1.0.0' },
      { capabilities: {} },
    );

    const sseUrl = new URL(`http://localhost:${testPort}/sse`);
    const transport = new SSEClientTransport(sseUrl);
    await client.connect(transport);

    const tools = await client.listTools();
    expect(tools.tools[0].name).toBe('hello-world');

    const result = await client.callTool({
      name: 'hello-world',
      arguments: { name: 'World' },
    });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: "Hello, World! I'm Test User from Test Org.",
        },
      ],
    });
    await client.close();
  });
});
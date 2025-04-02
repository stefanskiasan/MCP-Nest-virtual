import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Progress } from "@modelcontextprotocol/sdk/types.js";
import { INestApplication, Injectable } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { z } from "zod";
import { Context, Tool } from "../src";
import { McpModule } from "../src/mcp.module";

// Mock user repository
@Injectable()
class MockUserRepository {
  async findOne() {
    return {
      id: "userRepo123",
      name: "Repository User",
      orgMemberships: [
        {
          orgId: "org123",
          organization: {
            name: "Repository Org",
          },
        },
      ],
    };
  }
}

// Greeting tool that uses the authentication context
@Injectable()
export class AuthGreetingTool {
  constructor(private readonly userRepository: MockUserRepository) {}

  @Tool({
    name: "hello-world",
    description: "A sample tool that accesses the authenticated user",
    parameters: z.object({
      name: z.string().default("World"),
    }),
  })
  async sayHello({ name }, context: Context, request: Request & { user: any }) {
    // Access both repository data and the authenticated user context
    const repoUser = await this.userRepository.findOne();
    const authUser = request.user; // Authenticated user from the request

    // Construct greeting using both data sources
    const greeting = `Hello, ${name}! I'm ${authUser.name} from ${
      authUser.orgMemberships[0].organization.name
    }. Repository user is ${repoUser.name}.`;

    // Report progress for demonstration
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      await context.reportProgress({
        progress: (i+1) * 20,
        total: 100,
      } as Progress);
    }

    return {
      content: [
        {
          type: "text",
          text: greeting,
        },
      ],
    };
  }
}

describe("E2E: MCP Server with Authentication", () => {
  let app: INestApplication;
  let testPort: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        McpModule.forRoot({
          name: "test-mcp-server",
          version: "0.0.1",
          // Specify the MockAuthGuard to protect the messages endpoint
          guards: [],
        }),
      ],
      providers: [AuthGreetingTool, MockUserRepository],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);

    const server = app.getHttpServer();
    testPort = server.address().port;
  });

  afterAll(async () => {
    await app.close();
  });

  it("should list tools", async () => {
    const client = new Client(
      { name: "example-client", version: "1.0.0" },
      { capabilities: {} },
    );
    const sseUrl = new URL(`http://localhost:${testPort}/sse`);
    const transport = new SSEClientTransport(sseUrl);
    await client.connect(transport);
    const tools = await client.listTools();

    // Verify that the authenticated tool is available
    expect(tools.tools.length).toBeGreaterThan(0);
    expect(tools.tools.find((t) => t.name === "hello-world")).toBeDefined();

    await client.close();
  });
});
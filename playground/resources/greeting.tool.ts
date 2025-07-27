import type { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { Context, Tool } from '../../src';
import { Progress } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

@Injectable()
export class GreetingTool {
  @Tool({
    name: 'hello-world',
    description:
      'Returns a greeting and simulates a long operation with progress updates',
    parameters: z.object({
      name: z.string().default('World'),
    }),
    annotations: {
      title: 'Greeting Tool',
      destructiveHint: false,
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  })
  async sayHello({ name }, context: Context, request: Request) {
    let greeting: string;

    // request is not defined for stdio server
    if (request && typeof request.get === 'function') {
      const userAgent = request.get('user-agent') || 'Unknown';
      greeting = `Hello, ${name}! Your user agent is: ${userAgent}`;
    } else {
      greeting = `Hello, ${name}!`;
    }

    const totalSteps = 5;
    for (let i = 0; i < totalSteps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Send a progress update.
      await context.reportProgress({
        progress: (i + 1) * 20,
        total: 100,
      } as Progress);
    }

    return greeting;
  }

  @Tool({
    name: 'hello-world-elicitation',
    description:
      'Returns a greeting and simulates a long operation with progress updates',
    parameters: z.object({
      name: z.string().default('World'),
    }),
    annotations: {
      title: 'Greeting Tool with Elicitation',
      destructiveHint: false,
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  })
  async sayHelloElicitation({ name }, context: Context, request: Request) {
    try {
      let greeting: string;

      const res = context.mcpServer.server.getClientCapabilities();
      if (!res?.elicitation) {
        return {
          content: [
            {
              type: 'text',
              text: 'Elicitation is not supported by the server. Thus this tool cannot be used.',
            },
          ],
        };
      }

      const response = await context.mcpServer.server.elicitInput({
        message: 'Please provide your name',
        requestedSchema: {
          type: 'object',
          properties: {
            surname: { type: 'string', description: 'Your surname' },
          },
        },
      });
      let fullName = '';
      switch (response.action) {
        case 'accept': {
          const surname = response?.content?.surname as string;
          fullName = `${name} ${surname}`;
          break;
        }
        case 'decline':
        case 'cancel':
          fullName = name;
          break;
        default:
          fullName = name;
      }

      // request is not defined for stdio server
      if (request && typeof request.get === 'function') {
        const userAgent = request.get('user-agent') || 'Unknown';
        greeting = `Hello, ${fullName}! Your user agent is: ${userAgent}`;
      } else {
        greeting = `Hello, ${fullName}!`;
      }

      return {
        content: [{ type: 'text', text: greeting }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
      };
    }
  }

  @Tool({
    name: 'hello-world-structured',
    description:
      'Returns a greeting and simulates a long operation with progress updates',
    parameters: z.object({
      name: z.string().default('World'),
    }),
    outputSchema: z.object({
      type: z.literal('text'),
      text: z.string(),
    }),
    annotations: {
      title: 'Greeting Tool',
      destructiveHint: false,
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  })
  async sayHelloStructured({ name }, context: Context, request: Request) {
    let greeting: string;

    // request is not defined for stdio server
    if (request && typeof request.get === 'function') {
      const userAgent = request.get('user-agent') || 'Unknown';
      greeting = `Hello, ${name}! Your user agent is: ${userAgent}`;
    } else {
      greeting = `Hello, ${name}!`;
    }

    const totalSteps = 5;
    for (let i = 0; i < totalSteps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Send a progress update.
      await context.reportProgress({
        progress: (i + 1) * 20,
        total: 100,
      } as Progress);
    }

    const structuredContent = { type: 'text', text: greeting };
    return {
      structuredContent,
      content: [
        {
          type: 'text',
          text: JSON.stringify(structuredContent, null, 2),
        },
      ],
    };
  }
}
